"use client"

import * as React from "react"
import {
  MessageSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { SearchChat } from "@/components/search-chat"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

import { User } from '@supabase/supabase-js'
import NewChatButton from "@/components/new-chat-button"
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useChatStore } from '@/store/chat-store';

// Add interface for the user data
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userData?: User;
}

interface Chat {
  id: string;
  title?: string; // Use optional if title might be undefined
}

export function AppSidebar({ userData, ...props }: AppSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const { currentChatId, loadChat } = useChatStore();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('chatbot_chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setChats(data);
      }
    };

    fetchChats();
  }, []);

  const handleChatClick = async (chatId: string) => {
    try {
      await loadChat(supabase, chatId);
      router.push(`/chat/${chatId}`, { scroll: false });
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const navMainItems = [
    {
      title: "Chats",
      url: "#",
      icon: MessageSquare,
      isActive: true,
      items: chats.map(chat => ({
        title: chat.title || 'New Chat',
        url: `/chat/${chat.id}`,
        isActive: chat.id === currentChatId,
        onClick: () => handleChatClick(chat.id)
      }))
    }
  ];

  const user = userData ? {
    name: userData.user_metadata?.full_name || userData.email?.split('@')[0] || 'User',
    email: userData.email || '',
    avatar: userData.user_metadata?.avatar_url || userData.user_metadata?.picture || '',
  } : {
    name: 'User',
    email: '',
    avatar: '',
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="mx-2 flex flex-row gap-4 justify-end items-center mt-[.1rem] group-has-[[data-collapsible=icon]]/sidebar-wrapper:flex-col">
        <SearchChat />
        <NewChatButton />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
