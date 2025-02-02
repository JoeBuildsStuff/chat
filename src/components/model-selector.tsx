import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ModelSelector() {
  return (
    <Select defaultValue="gpt-4o">
      <SelectTrigger className="w-fit border-none">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="gpt-4o">GPT 4o</SelectItem>
        <SelectItem value="gpt-4o-mini">GPT 4o mini</SelectItem>
        <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
      </SelectContent>
    </Select>
  );
}