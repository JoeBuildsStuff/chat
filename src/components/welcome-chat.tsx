import React from "react";
import {
  Sun,
  Moon,
  Coffee,
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

// Utility function to get the greeting based on the current time
const getGreeting = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) {
    return { text: "Good morning!", Icon: Coffee };
  } else if (currentHour < 18) {
    return { text: "Good afternoon!", Icon: Sun };
  } else {
    return { text: "Good evening!", Icon: Moon };
  }
};

const WelcomeChat = () => {
  const { text, Icon } = getGreeting();

  return (
    <div className="">
      <div className="max-w-md md:max-w-xl lg:max-w-3xl mx-auto">
        <div className="w-full flex flex-col items-center gap-2">
          <Badge className="py-1 px-6 text-base">Guest Plan</Badge>

          <h1 className="text-4xl font-light mb-6 flex items-center">
            <Icon className="h-8 w-8 inline-block mr-2 relative top-[0rem]" />
            <span>{text}</span> {/* Use the greeting here */}
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
            <span className="font-semibold">Prompt Suggestions:</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              title: "Customer Persona",
              description:
                "Create a detailed customer persona for our target market.",
            },
            {
              title: "Feature Prioritization",
              description:
                "Analyze and prioritize our product backlog for the next quarter.",
            },
            {
              title: "Pricing Strategy",
              description:
                "Suggest optimal pricing tiers based on our features and market.",
            },
            {
              title: "Churn Reduction",
              description:
                "Propose strategies to reduce customer churn rate by 20%.",
            },
            {
              title: "Competitor Analysis",
              description:
                "Compare our product features with top 3 competitors.",
            },
            {
              title: "Growth Hacking",
              description:
                "Generate 5 creative growth hacking ideas for rapid user acquisition.",
            },
          ].map((chat, index) => (
            <Card key={index} className="">
              <CardHeader>
                <CardTitle className="text-lg">{chat.title}</CardTitle>
                <CardDescription>{chat.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeChat;
