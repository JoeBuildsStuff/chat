import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "edge";

// Define the system message for role prompting
const SYSTEM_MESSAGE = `You are an AI assistant. You are free to answer questions with or without the tools.  You do not need to remind the user
each time you respond that you do not have a tool for the user's question.  When a tool is a good fit for the user's question, you can use the tool.
When using a tool, please let the user know what tool you are using and why.  When you are using the summarize_url tool be sure to include in your
response the URL you are summarizing even if the user provided the url in their message.`;

// Define tool types
type ToolSchema = {
  type: "object";
  properties: Record<string, { 
    type: string; 
    items?: {  //used if passing an array of objects
      type: string; 
      properties?: Record<string, unknown>;
      required?: string[]; 
    }; 
    description: string 
  }>;
  required: string[];
};

type Tool = {
  name: string;
  description: string;
  schema: ToolSchema;
  handler: (input: any, userId: string) => Promise<string>;
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
    name: "get_current_datetime",
    description: "Gets the current date and time.",
    schema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      const now = new Date();
      const currentDateTime = now.toISOString();
      console.log("Current date and time:", currentDateTime);
      return currentDateTime;
    },
  },
  {
    name: "get_website_content",
    description: "Retrieves the content of a given URL using Jina AI Reader which will return the markdown content of the website.",
    schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to retrieve the content from." },
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
  {
    name: "jina_search",
    description: "Performs a web search using Jina AI Reader API and returns the top results.  When using the jina_search tool, please include the query in your response. Also include the URL of the search results.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query to perform." },
      },
      required: ["query"],
    },
    handler: async ({ query }: { query: string }) => {
      console.log("Performing Jina search for:", query);
      try {
        const response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
          headers: {
            "X-Return-Format": "text",
            Authorization: `Bearer ${process.env.JINA_API_KEY}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const searchResults = await response.text();
        console.log(
          "Jina search results:",
          searchResults.substring(0, 200) + "..."
        );
        return searchResults;
      } catch (error) {
        console.error("Error performing Jina search:", error);
        return `Error: Unable to perform Jina search. ${error}`;
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
  supabase: SupabaseClient<any, "public", any>,
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
    const updatedCost = currentCost + totalCost

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ api_cost_chat: updatedCost })
      .eq('id', userId)

    if (updateError) throw updateError
  } catch (error) {
    console.error("Error updating user API cost:", error)
    throw error
  }
}

async function processChunks(
  stream: AsyncIterable<any>,
  anthropic: Anthropic,
  anthropicMessages: any[],
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  supabase: SupabaseClient<any, "public", any>,
  userId: string,
  totalInputTokens: number = 0,
  totalOutputTokens: number = 0,
  isTopLevelCall: boolean = true,
  inputCost: number,
  outputCost: number
) {
  let isClosed = false;
  let currentToolUse: any = null;
  let currentToolInput = "";
  let currentResponseText = "";

  try {
    for await (const chunk of stream) {
      console.log("chunk", chunk);
      if (chunk.type === "message_start") {
        totalInputTokens += chunk.message.usage.input_tokens;
        console.log(`Message start: input tokens = ${totalInputTokens}`);
      } else if (chunk.type === "message_delta") {
        totalOutputTokens += chunk.usage.output_tokens;
        console.log(`Message delta: output tokens = ${totalOutputTokens}`);
      }

      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        currentResponseText += chunk.delta.text;
        console.log(`Text delta: ${chunk.delta.text}`);
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
        console.log(`Tool use started: ${currentToolUse.name}`);
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
        console.log(`Input JSON delta: ${chunk.delta.partial_json}`);
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
          console.log(`Tool use stopped: ${currentToolUse.name}`);
          const toolInput = currentToolInput ? JSON.parse(currentToolInput) : {};
          const tool = tools.find((t) => t.name === currentToolUse.name);

          if (tool) {
            console.log(`Executing tool handler: ${tool.name}`);
            const toolResult = await tool.handler(toolInput, userId);
            console.log(`Tool result: ${toolResult}`);

            // Stream tool result to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_result",
                  tool: currentToolUse.name,
                  result: toolResult,
                })}\n\n`
              )
            );

            anthropicMessages.push({
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
            });

            anthropicMessages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: currentToolUse.id,
                  content: toolResult,
                },
              ],
            });

            console.log(`Updated messages: ${JSON.stringify(anthropicMessages)}`);

            // Create a new message to process the tool result
            const toolResultResponse = await anthropic.messages.create({
              model: "claude-3-5-sonnet-20240620",
              max_tokens: 1000,
              messages: anthropicMessages,
              stream: true,
              tools: anthropicTools,
            });

            // Process the new message stream
            await processChunks(
              toolResultResponse,
              anthropic,
              anthropicMessages,
              encoder,
              controller,
              supabase,
              userId,
              totalInputTokens,
              totalOutputTokens,
              false,
              inputCost,
              outputCost
            );
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "tool_finished",
                tool: currentToolUse.name,
              })}\n\n`
            )
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "tool_error",
                tool: currentToolUse.name,
                error: error instanceof Error ? error.message : String(error),
              })}\n\n`
            )
          );
        }

        currentToolUse = null;
        currentToolInput = "";
        currentResponseText = "";
      }
    }

    console.log("Stream processing completed!");

    // Calculate and log totals
    const inputTotalCost = (totalInputTokens / 1_000_000) * inputCost;
    const outputTotalCost = (totalOutputTokens / 1_000_000) * outputCost;
    const totalCost = inputTotalCost + outputTotalCost;

    console.log(`Total input tokens: ${totalInputTokens}`);
    console.log(`Total output tokens: ${totalOutputTokens}`);
    console.log(`Total cost: ${totalCost}`);

    if (!isClosed) {
      try {
        await updateUserCost(supabase, userId, totalCost);
        console.log("Attempting to enqueue final cost data");
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              totalInputTokens,
              totalOutputTokens,
              inputCost: inputTotalCost,
              outputCost: outputTotalCost,
              totalCost,
            })}\n\n`
          )
        );
      } catch (error) {
        console.error("Error enqueuing final cost data:", error);
      }

      // Only send DONE message and close controller if this is the top-level call
      if (isTopLevelCall) {
        try {
          console.log("Attempting to enqueue DONE message");
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          console.error("Error enqueuing DONE message:", error);
        }

        try {
          console.log("Attempting to close controller");
          controller.close();
          isClosed = true;
        } catch (closeError) {
          console.error("Error closing controller:", closeError);
        }
      }
    }
  } catch (error) {
    console.error("Error in processChunks:", error);
    if (!isClosed) {
      try {
        console.log("Attempting to enqueue error message");
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: "An error occurred while processing the response",
            })}\n\n`
          )
        );
      } catch (enqueueError) {
        console.error("Error enqueuing error message:", enqueueError);
      }
    }
  }
}

export async function POST(req: NextRequest) {
  console.log("new request");
  const supabaseClient = await createClient();

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const formData = await req.formData();
  const messages = JSON.parse(formData.get("messages") as string);
  const selectedModel = formData.get("model") as string;
  const inputCost = parseFloat(formData.get("inputCost") as string);
  const outputCost = parseFloat(formData.get("outputCost") as string);
  const files = formData.getAll("files") as File[];

  const fileContent = await processFiles(files);
  const lastUserMessage = messages[messages.length - 1];
  lastUserMessage.content += "\n\n" + fileContent;

  // Prepare messages for Anthropic API
  const anthropicMessages = prepareAnthropicMessages(messages);

  const stream = await anthropic.messages.create({
    model: selectedModel,
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
      try {
        await processChunks(
          stream,
          anthropic,
          anthropicMessages,
          encoder,
          controller,
          supabaseClient,
          user?.id || "",
          0,
          0,
          true,
          inputCost,
          outputCost
        );
      } catch (error) {
        console.error("Error in stream processing:", error);
        if (!controller.desiredSize) {
          controller.error(error);
        }
      }
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