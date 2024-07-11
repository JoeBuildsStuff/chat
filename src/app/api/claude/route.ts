import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "edge";

// Define cost constants
const INPUT_TOKEN_COST = 3; // Cost per 1,000,000 input tokens
const OUTPUT_TOKEN_COST = 15; // Cost per 1,000,000 output tokens

// Add the random number generator tool
const tools: Anthropic.Messages.Tool[] = [
  {
    name: "generate_random_number",
    description: "Generates a random number within a specified range.",
    input_schema: {
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
  },
];

export async function POST(req: NextRequest) {
  // Authenticate the user
  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const formData = await req.formData();
  const messagesJson = formData.get("messages") as string;
  const messages = JSON.parse(messagesJson);
  const files = formData.getAll("files") as File[];

  // Process file contents
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const text = await file.text();
      return `File: ${file.name}\nContent:\n${text}\n\n`;
    })
  );

  // Combine file contents with user message
  const lastUserMessage = messages[messages.length - 1];
  lastUserMessage.content += "\n\n" + fileContents.join("");

  // Convert the messages to the format expected by Anthropic
  const anthropicMessages = messages.map((msg: any) => ({
    role: msg.role,
    content: [{ type: "text", text: msg.content }],
  }));

  const stream = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 3000,
    temperature: 0,
    messages: anthropicMessages,
    stream: true,
    tools: tools,
  });

  const encoder = new TextEncoder();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let waitingForToolResult = false;

  const customReadable = new ReadableStream({
    async start(controller) {
      let currentToolUse = null;
      let currentToolInput = "";

      let currentResponseText = "";
      for await (const chunk of stream) {
        //extract input tokens
        if (chunk.type === "message_start") {
          totalInputTokens = chunk.message.usage.input_tokens;
        }

        //extract output tokens
        if (chunk.type === "message_delta") {
          totalOutputTokens = chunk.usage.output_tokens;
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
          // Start of a new tool use
          currentToolUse = chunk.content_block;
          currentToolInput = "";
        } else if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "input_json_delta"
        ) {
          // Accumulate tool input
          currentToolInput += chunk.delta.partial_json;
        } else if (chunk.type === "content_block_stop" && currentToolUse) {
          // End of tool input, parse and execute
          try {
            const toolInput = JSON.parse(currentToolInput);

            if (currentToolUse.name === "generate_random_number") {
              const { min, max } = toolInput;

              const randomNumber =
                Math.floor(Math.random() * (max - min + 1)) + min;
              const toolResult = {
                tool_use_id: currentToolUse.id,
                content: randomNumber.toString(),
              };

              // Prepare messages array before sending tool result back to Claude
              const updatedMessages: Anthropic.Messages.MessageParam[] = [
                ...messages.map((msg: any) => ({
                  role: msg.role,
                  content: msg.content,
                })),
                {
                  role: "assistant",
                  content: [
                    {
                      type: "text",
                      text: currentResponseText,
                    },
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
                      content: toolResult.content,
                    },
                  ],
                },
              ];

              waitingForToolResult = true;
              const toolResultResponse = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 1000,
                messages: updatedMessages,
                stream: true,
                tools: tools,
              });

              if (!toolResultResponse) {
                console.error("No response from Claude", toolResultResponse);
                throw new Error("No response from Claude");
              }

              // Process Claude's response after tool use
              for await (const responseChunk of toolResultResponse) {
                if (
                  responseChunk.type === "content_block_delta" &&
                  responseChunk.delta.type === "text_delta"
                ) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify(responseChunk.delta.text)}\n\n`
                    )
                  );
                }

                // Accumulate output tokens from responseChunk
                if (responseChunk.type === "message_delta") {
                  totalOutputTokens += responseChunk.usage.output_tokens;
                }

                // Accumulate input tokens from responseChunk
                if (responseChunk.type === "message_start") {
                  totalInputTokens += responseChunk.message.usage.input_tokens;
                }
              }

              waitingForToolResult = false;
            }

            // Reset for next tool use
            currentToolUse = null;
            currentToolInput = "";
          } catch (error) {
            console.error("Error parsing or executing tool input:", error);
          }
        }
      }

      // Calculate costs
      const inputCost = (totalInputTokens / 1_000_000) * INPUT_TOKEN_COST;
      const outputCost = (totalOutputTokens / 1_000_000) * OUTPUT_TOKEN_COST;
      const totalCost = inputCost + outputCost;

      // Update user's metadata with accumulated costs
      try {
        const user = await clerkClient.users.getUser(userId);
        const currentCost = (user.publicMetadata.totalCost as number) || 0;
        const updatedCost = currentCost + totalCost;

        await clerkClient.users.updateUser(userId, {
          publicMetadata: {
            ...user.publicMetadata,
            totalCost: updatedCost,
          },
        });
      } catch (error) {
        console.error("Error updating user metadata:", error);
        // You might want to add some error handling here, such as sending an error response
      }

      // Send the token counts and costs at the end of the stream
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
