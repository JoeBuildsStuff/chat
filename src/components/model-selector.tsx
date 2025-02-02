import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";
  
  // Define a TypeScript type for the model items
  type Model = {
    value: string;
    label: string;
    badge?: string; // Optional badge property
  };
  
  const models: Model[] = [
    { value: "gpt-4o-mini", label: "GPT 4o mini"},
    { value: "claude-3-5-haiku", label: "Claude 3.5 Haiku" },
    { value: "gpt-4o", label: "GPT 4o", badge: "Pro" },
    { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", badge: "Pro" },
  ];
  
  export default function ModelSelector() {
    return (
      <Select defaultValue="gpt-4o-mini">
        <SelectTrigger className="w-fit border-none">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem
              key={model.value}
              value={model.value}
              className="flex items-center justify-between w-full"
            >
              {/* The text container takes full width to ensure left alignment */}
              <span className="flex-1 text-left">{model.label}</span>
              {/* Render the badge if available */}
              {model.badge && (
                <Badge variant="default" className="ml-4">
                  {model.badge}
                </Badge>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  