export default function ChatPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const chatid = params.id;

  return <main className="">chat page{chatid}</main>;
}
