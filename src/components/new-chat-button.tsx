"use client";

import { SquarePen } from "lucide-react";
import { Button } from "./ui/button";
import { useChatStore } from "@/store/chat-store";

export default function NewChatButton() {
  const resetChat = useChatStore((state) => state.resetChat);
  
  return (
    <Button variant="ghost" size="icon" onClick={resetChat}>
      <SquarePen className="h-[1.2rem] w-[1.2rem]" />
    </Button>
  );
}