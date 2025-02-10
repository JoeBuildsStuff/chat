'use server'

import Chat from "@/components/chatbot/chat";
import { createClient } from '@/utils/supabase/server'
import { AuthAlert } from "@/components/auth-alert";
import { redirect } from 'next/navigation';

// Define the type for chat data
type ChatData = {
  id: string;
  user_id: string;
  // add other chat fields as needed
}

// Server action to fetch and verify chat
async function fetchAndVerifyChat(chatId: string, userId: string): Promise<ChatData | null> {
  const supabase = await createClient()
  
  const { data: chat, error } = await supabase
    .from('chatbot_chats')
    .select('*')
    .eq('id', chatId)
    .eq('user_id', userId)
    .single();

  if (error || !chat) {
    console.error('Chat not found or does not belong to user:', error)
    return null;
  }

  return chat;
}

export default async function ChatPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const chat = await fetchAndVerifyChat(params.id, user.id);
  
  if (!chat) {
    redirect('/')
  }

  return (
    <main className="">
      <div className="mx-8">
        <Chat chatId={params.id} isRootPage={false} />
      </div>
      <AuthAlert isOpen={!user} />
    </main>
  );
}