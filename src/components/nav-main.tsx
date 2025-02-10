"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { MessageSquare } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

interface Chat {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export function NavMain({
  chats,
}: {
  chats: Chat[]
}) {
  // Transform chats into the structure we need
  const items = [
    {
      title: "All Chats",
      url: "/chats",
      icon: MessageSquare,
      items: chats.map(chat => ({
        title: chat.title,
        url: `/chat/${chat.id}`,
        // You might want to add logic here to determine if a chat is active
        isActive: false,
        onClick: () => {
          // Add your chat navigation logic here
          window.location.href = `/chat/${chat.id}`
        }
      }))
    }
  ]

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={true}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        className={subItem.isActive ? 'bg-secondary' : ''}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            subItem.onClick?.();
                          }}
                        >
                          <span>{subItem.title}</span>
                        </button>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
