"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "../ui/textarea";
import { CornerRightUp, CopyIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import gfm from "remark-gfm";
import raw from "rehype-raw";
import CopyButton from "./copy-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FileItem from "./file-item";
import Link from "next/link";
import { useModelStore } from '@/components/model-selector'
import { useChatStore, type Message } from "@/store/chat-store";
import { createClient } from '@/utils/supabase/client';
import { useRouter } from "next/navigation";
import { generateChatTitle } from '@/utils/generateChatTitle';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative flex flex-col rounded-lg my-2 bg-primary-foreground border max-w-2xl overflow-x-auto">
      <div className="text-text-300 absolute pl-3 pt-2.5 text-xs ">
        {language}
      </div>
      <div className=" pointer-events-none sticky z-20 my-0.5 ml-0.5 flex items-center justify-end px-1.5 py-1 mix-blend-luminosity top-0">
        <div className="from-bg-300/90 to-bg-300/70 pointer-events-auto rounded-md bg-gradient-to-b p-0.5 backdrop-blur-md">
          <button
            onClick={handleCopy}
            className="flex flex-row items-center gap-1 rounded-md p-1 py-0.5 text-xs transition-opacity delay-100 hover:bg-bg-200"
          >
            <CopyIcon
              size={14}
              className="text-text-500 mr-px -translate-y-[0.5px]"
            />
            <span className="text-text-200 pr-0.5">
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: "0",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

interface ChatProps {
  chatId?: string;
  isRootPage?: boolean;
}

export default function Chat({ chatId, isRootPage }: ChatProps) {

  const [inputMessage, setInputMessage] = useState("");
  const { messages, setMessages, currentChatId, setCurrentChatId, saveMessage, createNewChat } = useChatStore();
  const supabase = createClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSignInButton, setShowSignInButton] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [toolCallInProgress, setToolCallInProgress] = useState(false);
  const { selectedModel, reasoningModel, inputCost, outputCost } = useModelStore()

  const router = useRouter();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      // Only initialize chat if we have a chatId but no currentChatId
      if (chatId && !currentChatId) {
        try {
          setCurrentChatId(chatId);
        } catch (error) {
          console.error("Error initializing chat:", error);
        }
      }
    };

    initializeChat();
  }, [chatId, currentChatId, setCurrentChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const totalChatCost = useMemo(() => {
    return messages.reduce(
      (total, message) => total + (message.totalCost || 0),
      0
    );
  }, [messages]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setAttachedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const handleRemoveFile = (fileToRemove: File) => {
    setAttachedFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && attachedFiles.length === 0) return;

    try {
      // Create a new chat when on root page and no active chat exists
      if (isRootPage && !currentChatId) {
        // Create the chat with a temporary title
        const newChatId = await createNewChat(supabase);
        setCurrentChatId(newChatId);

        // Immediately generate a title from the user's initial input
        // (You might later decide to include more context such as the AI response)
        const title = await generateChatTitle(inputMessage);

        // Update the chat record with the proposed title
        const { error: updateError } = await supabase
          .from('chatbot_chats')
          .update({ title: title.title })
          .eq('id', newChatId);

        if (updateError) {
          console.error('Error updating chat title:', updateError);
        }

        // Process the message and update our chat history
        const userMessage: Message = { role: "user", content: inputMessage };
        await saveMessage(supabase, userMessage);
        setMessages([userMessage]);

        // Then handle the AI assistant response as existing
        await processAIResponse(userMessage);

        // Finally, navigate to the new chat page using the new chat id
        router.push(`/chat/${newChatId}`);
        return;
      }

      // Ensure we have a chat before proceeding
      if (!currentChatId) {
        await createNewChat(supabase);
      }

      setIsLoading(true);
      const userMessage: Message = { role: "user", content: inputMessage };

      await saveMessage(supabase, userMessage);
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInputMessage("");

      const formData = new FormData();
      formData.append("messages", JSON.stringify(updatedMessages));
      formData.append("model", selectedModel);
      formData.append("reasoningModel", reasoningModel.toString());
      formData.append("inputCost", inputCost.toString());
      formData.append("outputCost", outputCost.toString());
      attachedFiles.forEach((file) => formData.append("files", file));

      // Determine API route based on model
      const apiRoute = selectedModel.includes('claude') 
        ? '/api/anthropic'
        : '/api/openai-request'

      const res = await fetch(apiRoute, {
        method: "POST",
        body: formData,
      });

      if (res.status === 401) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant" as const,
            content: "Hold on! I need you to log in first before I can help.",
          },
        ]);
        setShowSignInButton(true);
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      let aiResponse = "";
      let accumulatedCost = {
        inputTokens: 0,
        outputTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
      };

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant" as const,
          content: "",
          inputTokens: 0,
          outputTokens: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);

        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsLoading(false);
              setToolCallInProgress(false);
              break;
            }
            try {
              const parsedData = JSON.parse(data);
              console.log("parsedData", parsedData);
              if (typeof parsedData === "string") {
                aiResponse += parsedData;
                setToolCallInProgress(false);
              } else if (parsedData.type === "tool_call") {
                aiResponse += `\n\n\`Tool call: ${parsedData.tool}\`\n\n`;
                setToolCallInProgress(true);
              } else if (parsedData.type === "tool_payload") {
                aiResponse += `${parsedData.payload}`;
                // Keep toolCallInProgress true here
              } else if (parsedData.type === "tool_result") {
                aiResponse += `\n\nResult: ${parsedData.result}\n\n`;
                setToolCallInProgress(false);
              } else if (parsedData.totalCost !== undefined) {
                // Accumulate costs
                accumulatedCost.inputTokens += parsedData.totalInputTokens;
                accumulatedCost.outputTokens += parsedData.totalOutputTokens;
                accumulatedCost.inputCost += parsedData.inputCost;
                accumulatedCost.outputCost += parsedData.outputCost;
                accumulatedCost.totalCost += parsedData.totalCost;

                setMessages((prevMessages) => {
                  const updatedMessages = [...prevMessages];
                  const lastMessage = updatedMessages[updatedMessages.length - 1];
                  lastMessage.inputTokens = accumulatedCost.inputTokens;
                  lastMessage.outputTokens = accumulatedCost.outputTokens;
                  lastMessage.inputCost = accumulatedCost.inputCost;
                  lastMessage.outputCost = accumulatedCost.outputCost;
                  lastMessage.totalCost = accumulatedCost.totalCost;
                  return updatedMessages;
                });
                setToolCallInProgress(false);
              }

              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                updatedMessages[updatedMessages.length - 1].content = aiResponse;
                return updatedMessages;
              });
            } catch (error) {
              console.error("Error parsing data:", error);
            }
          }
        }
      }

      // Save assistant message after receiving response
      if (aiResponse) {
        await saveMessage(supabase, {
          role: "assistant",
          content: aiResponse,
          inputTokens: accumulatedCost.inputTokens,
          outputTokens: accumulatedCost.outputTokens,
          inputCost: accumulatedCost.inputCost,
          outputCost: accumulatedCost.outputCost,
          totalCost: accumulatedCost.totalCost
        });
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant" as const,
          content: "An error occurred while sending the message.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setAttachedFiles([]);
    }
  };

  // Helper function to process AI response
  const processAIResponse = async (userMessage: Message) => {
    const formData = new FormData();
    formData.append("messages", JSON.stringify([userMessage]));
    formData.append("model", selectedModel);
    formData.append("reasoningModel", reasoningModel.toString());
    formData.append("inputCost", inputCost.toString());
    formData.append("outputCost", outputCost.toString());
    attachedFiles.forEach((file) => formData.append("files", file));

    const apiRoute = selectedModel.includes('claude') 
      ? '/api/anthropic'
      : '/api/openai-request';

    const res = await fetch(apiRoute, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to send message");
    }

    // Process the streaming response
    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("No reader available");
    }

    let aiResponse = "";
    let accumulatedCost = {
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: "assistant" as const,
        content: "",
        inputTokens: 0,
        outputTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
      },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);

      const lines = chunk.split("\n\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            setIsLoading(false);
            setToolCallInProgress(false);
            break;
          }
          try {
            const parsedData = JSON.parse(data);
            console.log("parsedData", parsedData);
            if (typeof parsedData === "string") {
              aiResponse += parsedData;
              setToolCallInProgress(false);
            } else if (parsedData.type === "tool_call") {
              aiResponse += `\n\n\`Tool call: ${parsedData.tool}\`\n\n`;
              setToolCallInProgress(true);
            } else if (parsedData.type === "tool_payload") {
              aiResponse += `${parsedData.payload}`;
              // Keep toolCallInProgress true here
            } else if (parsedData.type === "tool_result") {
              aiResponse += `\n\nResult: ${parsedData.result}\n\n`;
              setToolCallInProgress(false);
            } else if (parsedData.totalCost !== undefined) {
              // Accumulate costs
              accumulatedCost.inputTokens += parsedData.totalInputTokens;
              accumulatedCost.outputTokens += parsedData.totalOutputTokens;
              accumulatedCost.inputCost += parsedData.inputCost;
              accumulatedCost.outputCost += parsedData.outputCost;
              accumulatedCost.totalCost += parsedData.totalCost;

              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                const lastMessage = updatedMessages[updatedMessages.length - 1];
                lastMessage.inputTokens = accumulatedCost.inputTokens;
                lastMessage.outputTokens = accumulatedCost.outputTokens;
                lastMessage.inputCost = accumulatedCost.inputCost;
                lastMessage.outputCost = accumulatedCost.outputCost;
                lastMessage.totalCost = accumulatedCost.totalCost;
                return updatedMessages;
              });
              setToolCallInProgress(false);
            }

            setMessages((prevMessages) => {
              const updatedMessages = [...prevMessages];
              updatedMessages[updatedMessages.length - 1].content = aiResponse;
              return updatedMessages;
            });
          } catch (error) {
            console.error("Error parsing data:", error);
          }
        }
      }
    }

    // Save assistant message after receiving response
    if (aiResponse) {
      await saveMessage(supabase, {
        role: "assistant",
        content: aiResponse,
        inputTokens: accumulatedCost.inputTokens,
        outputTokens: accumulatedCost.outputTokens,
        inputCost: accumulatedCost.inputCost,
        outputCost: accumulatedCost.outputCost,
        totalCost: accumulatedCost.totalCost
      });
    }
  };

  const ToolCallIndicator = () => (
    <span
      className="loader"
      style={
        {
          "--loader-size": "18px",
          "--loader-color": "#000",
          "--loader-color-dark": "#fff",
        } as React.CSSProperties
      }
    ></span>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      <div className="flex-1 overflow-y-auto mb-4 pb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`group inline-block rounded-lg ${
                message.role === "user"
                  ? "bg-secondary text-secondary-foreground p-2"
                  : "py-4 px-4 border border-border text-secondary-foreground relative"
              }`}
            >
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="grid-col-1 grid gap-2.5 whitespace-pre-wrap">
                  <ReactMarkdown
                    remarkPlugins={[gfm as any]}
                    rehypePlugins={[raw as any]}
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="whitespace-pre-wrap" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          className="-mt-1 list-disc space-y-2 pl-8"
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          className="-mt-1 list-decimal space-y-2 pl-8"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li
                          className="whitespace-normal break-words"
                          {...props}
                        />
                      ),
                      code: ({
                        node,
                        //@ts-ignore
                        inline,
                        className,
                        children,
                        ...props
                      }) => {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <CodeBlock
                            language={match[1]}
                            value={String(children).replace(/\n$/, "")}
                          />
                        ) : (
                          <code
                            className="bg-secondary-foreground text-secondary px-1 rounded-sm"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {toolCallInProgress && index === messages.length - 1 && (
                    <ToolCallIndicator />
                  )}
                  {message.role === "assistant" &&
                    showSignInButton &&
                    index === messages.length - 1 && (
                      <div className="mt-2">
                        <Button
                          asChild
                          className=" text-white bg-violet-600 hover:bg-violet-500 dark:bg-violet-700 dark:hover:bg-violet-800"
                        >
                          <Link href="/login">Sign in</Link>
                        </Button>
                      </div>
                    )}
                  <div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="">
                          <div className="text-xs text-muted-foreground">
                            Message Cost: $
                            {message.totalCost?.toFixed(4) || "0.0000"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="">
                            Input cost: $
                            {message.inputCost?.toFixed(5) || "0.00000"} |
                            Output cost: $
                            {message.outputCost?.toFixed(5) || "0.00000"}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="hidden group-hover:block absolute -bottom-[.80rem] right-2">
                    <CopyButton text={message.content} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="sticky bottom-0 bg-background pt-2">
        {messages.length > 0 && (
          <div className="text-right mb-1 text-xs text-muted-foreground">
            Total Chat Cost: ${totalChatCost.toFixed(4)}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
          <div
            {...getRootProps()}
            className={`hidden relative border-2 border-dashed p-4 rounded-md text-center ${
              attachedFiles.length === 0 ? "min-h-[2rem]" : "min-h-[12rem]"
            } ${
              isDragActive
                ? "  border-blue-500  dark:border-blue-900"
                : "text-muted-foreground"
            }`}
          >
            <input {...getInputProps()} />
            {attachedFiles.length === 0 && (
              <p>
                {isDragActive ? (
                  <p className="text-muted-foreground">
                    Yum, yum... gimme some files!
                  </p>
                ) : (
                  "Drag n drop files here, or click to select"
                )}
              </p>
            )}
            <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-wrap content-start gap-4 p-4 overflow-auto">
              {attachedFiles.map((file, index) => (
                <FileItem
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={handleRemoveFile}
                />
              ))}
            </div>
            {attachedFiles.length > 0 && (
              <div className="absolute bottom-2 left-0 right-0 text-center"></div>
            )}
          </div>
          <div className="flex space-x-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message here"
              disabled={isLoading}
              className="relative flex-grow pr-[3.75rem]"
            />
            <Button
              size="icon"
              variant="secondary"
              type="submit"
              disabled={isLoading}
              className="absolute right-[.5rem] bottom-[2rem]"
            >
              {isLoading ? (
                <span
                  className="loader"
                  style={
                    {
                      "--loader-size": "18px",
                      "--loader-color": "#000",
                      "--loader-color-dark": "#fff",
                    } as React.CSSProperties
                  }
                ></span>
              ) : (
                <CornerRightUp className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
