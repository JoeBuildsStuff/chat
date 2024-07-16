import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";

// Define cost constants
const INPUT_TOKEN_COST = 3; // Cost per 1,000,000 input tokens
const OUTPUT_TOKEN_COST = 15; // Cost per 1,000,000 output tokens

// Define the system message for role prompting
const SYSTEM_MESSAGE = `You are an AI assistant. You are free to answer questions with or without the tools.  You do not need to remind the user
each time you respond that you do not have a tool for the user's question.  When a tool is a good fit for the user's question, you can use the tool.
When using a tool, please let the user know what tool you are using and why.  When you are using the summarize_url tool be sure to include in your
response the URL you are summarizing even if the user provided the url in their message.`;

// Define tool types
type ToolSchema = {
  type: "object";
  properties: Record<string, { type: string; description: string }>;
  required: string[];
};

type Tool = {
  name: string;
  description: string;
  schema: ToolSchema;
  handler: (input: any) => Promise<string>;
};

// Define tools
const tools: Tool[] = [
  {
    name: "generate_random_number",
    description: "Generates a random number within a specified range.",
    schema: {
      type: "object",
      properties: {
        min: {
          type: "number",
          description: "The minimum value of the range (inclusive).",
        },
        max: {
          type: "number",
          description: "The maximum value of the range (inclusive).",
        },
      },
      required: ["min", "max"],
    },
    handler: async ({ min, max }: { min: number; max: number }) => {
      console.log(`Generating random number between ${min} and ${max}`);
      const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
      return randomNumber.toString();
    },
  },
  {
    name: "summarize_url",
    description: "Summarizes the content of a given URL using Jina AI Reader.",
    schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to summarize." },
      },
      required: ["url"],
    },
    handler: async ({ url }: { url: string }) => {
      console.log("Summarizing URL:", url);
      try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            "X-Return-Format": "text",
            Authorization: `Bearer ${process.env.JINA_API_KEY}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const readerResponse = await response.text();
        console.log(
          "Jina AI Reader response:",
          readerResponse.substring(0, 200) + "..."
        );
        return readerResponse;
      } catch (error) {
        console.error("Error fetching URL content:", error);
        return `Error: Unable to fetch URL content. ${error}`;
      }
    },
  },
];

// Convert tools to Anthropic format
const anthropicTools: Anthropic.Messages.Tool[] = tools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.schema,
}));

async function processFiles(files: File[]): Promise<string> {
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const text = await file.text();
      return `File: ${file.name}\nContent:\n${text}\n\n`;
    })
  );
  return fileContents.join("");
}

async function updateUserCost(
  supabase: ReturnType<typeof createClient>, // Add this parameter
  userId: string,
  totalCost: number
): Promise<void> {
  try {
    // Get user current incurred total cost
    const { data, error } = await supabase
      .from('profiles')
      .select('api_cost_chat')
      .eq('id', userId)
      .single()

    if (error) throw error

    const currentCost = data?.api_cost_chat || 0

    // Add total cost to current cost
    const updatedCost = currentCost + totalCost

    // Update user cost in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ api_cost_chat: updatedCost })
      .eq('id', userId)

    if (updateError) throw updateError
  } catch (error) {
    console.error("Error updating user API cost:", error)
    throw error  // Re-throw the error for the caller to handle if needed
  }
}

async function processChunks(
  stream: AsyncIterable<any>,
  anthropic: Anthropic,
  anthropicMessages: any[],
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  totalInputTokens: number = 0,
  totalOutputTokens: number = 0
) {
  let currentToolUse: any = null;
  let currentToolInput = "";
  let currentResponseText = "";

  for await (const chunk of stream) {
    console.log("chunk", chunk);
    if (chunk.type === "message_start") {
      totalInputTokens += chunk.message.usage.input_tokens;
    } else if (chunk.type === "message_delta") {
      totalOutputTokens += chunk.usage.output_tokens;
    }

    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      currentResponseText += chunk.delta.text;
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(chunk.delta.text)}\n\n`)
      );
    }

    if (
      chunk.type === "content_block_start" &&
      chunk.content_block.type === "tool_use"
    ) {
      currentToolUse = chunk.content_block;
      currentToolInput = "";
      // Notify client of tool call
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "tool_call",
            tool: currentToolUse.name,
          })}\n\n`
        )
      );
    } else if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "input_json_delta"
    ) {
      currentToolInput += chunk.delta.partial_json;
      // Stream the input JSON to the client
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "tool_payload",
            payload: chunk.delta.partial_json,
          })}\n\n`
        )
      );
    } else if (chunk.type === "content_block_stop" && currentToolUse) {
      try {
        const toolInput = JSON.parse(currentToolInput);
        const tool = tools.find((t) => t.name === currentToolUse.name);

        if (tool) {
          const toolResult = await tool.handler(toolInput);
          const updatedMessages: Anthropic.Messages.MessageParam[] = [
            ...anthropicMessages,
            {
              role: "assistant",
              content: [
                { type: "text", text: currentResponseText },
                {
                  type: currentToolUse.type,
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: toolInput,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: currentToolUse.id,
                  content: toolResult,
                },
              ],
            },
          ];

          const toolResultResponse = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1000,
            messages: updatedMessages,
            stream: true,
            tools: anthropicTools,
          });

          await processChunks(
            toolResultResponse,
            anthropic,
            updatedMessages,
            encoder,
            controller,
            supabase,
            userId,
            totalInputTokens,
            totalOutputTokens
          );
        }

        // Notify client that the tool has finished
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "tool_finished",
              tool: currentToolUse.name,
            })}\n\n`
          )
        );

        currentToolUse = null;
        currentToolInput = "";
      } catch (error) {
        console.error("Error parsing or executing tool input:", error);
      }
    }
  }

  const inputCost = (totalInputTokens / 1_000_000) * INPUT_TOKEN_COST;
  const outputCost = (totalOutputTokens / 1_000_000) * OUTPUT_TOKEN_COST;
  const totalCost = inputCost + outputCost;

  await updateUserCost(supabase, userId, totalCost);

  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        inputCost: inputCost.toFixed(6),
        outputCost: outputCost.toFixed(6),
      })}\n\n`
    )
  );

  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
  controller.close();
}

export async function POST(req: NextRequest) {
  console.log("new request");
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const formData = await req.formData();
  const messages = JSON.parse(formData.get("messages") as string);
  const files = formData.getAll("files") as File[];

  const fileContent = await processFiles(files);
  const lastUserMessage = messages[messages.length - 1];
  lastUserMessage.content += "\n\n" + fileContent;

  // Prepare messages for Anthropic API
  const anthropicMessages = prepareAnthropicMessages(messages);

  console.log("anthropicMessages", JSON.stringify(anthropicMessages, null, 2));

  const stream = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 3000,
    temperature: 0,
    messages: anthropicMessages,
    stream: true,
    tools: anthropicTools,
    system: SYSTEM_MESSAGE,
  });

  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      await processChunks(
        stream,
        anthropic,
        anthropicMessages,
        encoder,
        controller,
        supabase,
        user.id
      );
    },
  });

  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function prepareAnthropicMessages(messages: any[]): Anthropic.Messages.MessageParam[] {
  const anthropicMessages: Anthropic.Messages.MessageParam[] = [];
  
  for (const message of messages) {
    if (message.role === "user") {
      anthropicMessages.push({
        role: "user",
        content: [{ type: "text", text: message.content }],
      });
    } else if (message.role === "assistant") {
      // Combine all assistant messages into a single message
      const lastAssistantMessage = anthropicMessages[anthropicMessages.length - 1];
      if (lastAssistantMessage && lastAssistantMessage.role === "assistant") {
        if (Array.isArray(lastAssistantMessage.content)) {
          lastAssistantMessage.content.push({ type: "text", text: message.content });
        } else {
          lastAssistantMessage.content = [
            { type: "text", text: lastAssistantMessage.content },
            { type: "text", text: message.content },
          ];
        }
      } else {
        anthropicMessages.push({
          role: "assistant",
          content: [{ type: "text", text: message.content }],
        });
      }
    }
  }

  return anthropicMessages;
}