import Chat from "@/components/chatbot/chat";
import { createClient } from '@/utils/supabase/server'
import { AuthAlert } from "@/components/auth-alert";

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="">
      <div className="mx-8">
      <Chat isRootPage={true} />
      </div>
      <AuthAlert isOpen={!user} />
    </main>
  );
}
