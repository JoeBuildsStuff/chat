'use server'

import * as React from "react"

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
import { createClient } from '@/utils/supabase/server';

// Add interface for the user data
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userData?: User;
}

interface Chat {
  id: string;
  title?: string; // Use optional if title might be undefined
}

export async function AppSidebar({ userData, ...props }: AppSidebarProps) {
  const supabase = await createClient();

  const { data: chats, error } = await supabase
    .from('chatbot_chats')
    .select('*')
    .order('updated_at', { ascending: false });

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
        <NavMain chats={chats ?? []} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
