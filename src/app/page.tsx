import Chat from "@/components/chatbot/chat";
import { createClient } from '@/utils/supabase/server'
import { AuthAlert } from "@/components/auth-alert";

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="">
      <Chat />
      <AuthAlert isOpen={!user} />
    </main>
  );
}
