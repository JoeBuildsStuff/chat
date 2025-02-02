"use client"

import * as React from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { MessageSquare, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
// Placeholder data for chats
const placeholderChats = [
  {
    id: 1,
    title: "Chat about React Components",
    preview: "Last message about component architecture...",
    date: "2 days ago",
  },
  {
    id: 2,
    title: "TypeScript Discussion",
    preview: "Discussing type safety and interfaces...",
    date: "1 day ago",
  },
  {
    id: 3,
    title: "Project Planning",
    preview: "Planning the next sprint...",
    date: "3 hours ago",
  },
  {
    id: 4,
    title: "Project Planning",
    preview: "Planning the next sprint...",
    date: "3 hours ago",
  },
  {
    id: 5,
    title: "Project Planning",
    preview: "Planning the next sprint...",
    date: "3 hours ago",
  },
  {
    id: 6,
    title: "Project Planning",
    preview: "Planning the next sprint...",
    date: "3 hours ago",
  },
]

export function SearchChat() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="ghost"
        size="icon"
      >
        <span className="sr-only">Search chats</span>
        <Search className="h-5 w-5" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search all chats..." />
        <CommandList>
          <CommandEmpty>No chats found.</CommandEmpty>
          <CommandGroup heading="Recent Chats">
            {placeholderChats.map((chat) => (
              <CommandItem
                key={chat.id}
                onSelect={() => {
                  // Handle chat selection here
                  setOpen(false)
                }}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{chat.title}</span>
                  <span className="text-sm text-muted-foreground">{chat.preview}</span>
                </div>
                <span className="ml-auto text-sm text-muted-foreground">{chat.date}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
