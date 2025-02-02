"use client"

import * as React from "react"
import {
  SquarePen,
  MessageSquare,
} from "lucide-react"

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

// Add interface for the user data
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userData?: User;
}

// Update the data object
const data = {
  navMain: [
    {
      title: "Today",
      url: "#",
      icon: MessageSquare,
      isActive: true,
      items: [
        {
          title: "Chat 1",
          url: "/",
        },
        {
          title: "Chat 2",
          url: "/",
        },
        {
          title: "Chat 3",
          url: "/",
        },
      ],
    },
  ],      
}

export function AppSidebar({ userData, ...props }: AppSidebarProps) {
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
        <SquarePen className="h-[1.2rem] w-[1.2rem]" />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
