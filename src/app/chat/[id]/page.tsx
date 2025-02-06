import Chat from "@/components/chatbot/chat";
import { createClient } from '@/utils/supabase/server'
import { AuthAlert } from "@/components/auth-alert";
import { redirect } from 'next/navigation';

export default async function ChatPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  // Verify chat exists and belongs to user
  const { data: chat, error } = await supabase
    .from('chatbot_chats')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !chat) {
    console.error('Chat not found or does not belong to user:', error)
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