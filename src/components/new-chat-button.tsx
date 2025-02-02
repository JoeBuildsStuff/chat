import { SquarePen } from "lucide-react";
import { Button } from "./ui/button";

export default function NewChatButton() {
  return (
    <Button variant="ghost" size="icon">
      <SquarePen className="h-[1.2rem] w-[1.2rem]" />
    </Button>
  );
}