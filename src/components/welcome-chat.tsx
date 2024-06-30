import React from "react";
import {
  Sun,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardHeader, CardDescription, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

const WelcomeChat = () => {
  return (
    <div className="">
      <div className="max-w-md md:max-w-xl lg:max-w-3xl mx-auto">
        <div className="w-full flex flex-col items-center gap-2">
          <Badge className="py-1 px-6 text-base">Guest Plan</Badge>

          <h1 className="text-4xl font-light mb-6 flex items-center">
            <Sun className="h-8 w-8 inline-block mr-2 relative top-[0rem]" />
            <span>Good morning!</span>
          </h1>
        </div>
        <Card className="relative border-none">
          <Textarea
            placeholder="Give me 5 ideas for a Saas company about..."
            className="pl-[7.25rem]" // Add padding to the left to indent the text
          />
          <Badge className="absolute top-[.25rem] left-[.25rem] flex items-center w-fit">
            <span className="py-[.25rem] px-[.25rem]">@3.5 Sonnet</span>
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-[.25rem] right-[.25rem]"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </Card>

        <div className="flex items-center justify-between mt-6 mb-2">
          <div className="flex items-center">
            <MessageSquare size={16} className="mr-2" />
            <span className="font-semibold">Your recent chats</span>
            <ChevronDown size={16} className="ml-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              title: "Uploading Code to GitHub from Visual...",
              time: "6 minutes ago",
            },
            {
              title: "Pushing Local Code to GitHub Repo",
              time: "7 minutes ago",
            },
            { title: "Markdown Task List React App", time: "2 hours ago" },
            {
              title: "Explaining how to use a React component",
              time: "2 hours ago",
            },
            {
              title: "Complementary Dark Theme for Custom CSS...",
              time: "2 hours ago",
            },
            {
              title: "AI-Powered Social Media Content Creation SaaS",
              time: "15 hours ago",
            },
          ].map((chat, index) => (
            <Card key={index} className="">
              <CardHeader>
                <CardTitle className="text-lg">{chat.title}</CardTitle>
                <CardDescription>{chat.time}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeChat;
