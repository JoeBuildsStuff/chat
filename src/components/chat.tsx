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

// Utility function to get the greeting based on the current time
const getGreeting = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) {
    return "Good morning!";
  } else if (currentHour < 18) {
    return "Good afternoon!";
  } else {
    return "Good evening!";
  }
};

export default function ChatPage() {
  return (
    <div className="">
      <div className="max-w-md md:max-w-xl lg:max-w-3xl mx-auto">
        <div className="w-full flex">div 1</div>
        <div className="w-full flex">div 2</div>
        <div className="w-full flex">div 3</div>
      </div>
    </div>
  );
}
