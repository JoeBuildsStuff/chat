"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageCircle } from "lucide-react";
import Chat from "@/components/chatbot/chat";

export default function ChatBotButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg"
        >
          <MessageCircle className="h-6 w-6 flex-none" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>Chat</SheetTitle>
        </SheetHeader>
        <div className="flex">
          <Chat />
        </div>
      </SheetContent>
    </Sheet>
  );
}
