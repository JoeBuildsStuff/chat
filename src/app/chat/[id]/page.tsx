import Chat from "@/components/chat";

export default function ChatPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const chatid = params.id;

  return (
    <main className="">
      <Chat />
    </main>
  );
}
