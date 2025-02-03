"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";
  import { create } from 'zustand'

  // Define a TypeScript type for the model items
  type Model = {
    value: string;
    label: string;
    reasoningModel: boolean;
    inputCost: number;
    outputCost: number;
    badge?: string; // Optional badge property
  };
  
  const models: Model[] = [
    { value: "gpt-4o-mini-2024-07-18", label: "GPT 4o mini", reasoningModel: false, inputCost: 0.00000015, outputCost: 0.0000006 },
    { value: "gpt-4o-2024-08-06", label: "GPT 4o", reasoningModel: false, inputCost: 0.0000025, outputCost: 0.00001, badge: "Pro" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", reasoningModel: false, inputCost: 0.000003, outputCost: 0.000015, badge: "Pro" },
    { value: "o3-mini-2025-01-31", label: "o3-mini", reasoningModel: true, inputCost: 0.0000011, outputCost: 0.0000044, badge: "Pro" },
  ];
  
  // Update store to include costs
  interface ModelStore {
    selectedModel: string
    reasoningModel: boolean
    inputCost: number
    outputCost: number
    setSelectedModel: (model: string) => void
  }

  export const useModelStore = create<ModelStore>((set) => ({
    selectedModel: models[0].value,
    reasoningModel: models[0].reasoningModel,
    inputCost: models[0].inputCost,
    outputCost: models[0].outputCost,
    setSelectedModel: (modelValue) => {
      const model = models.find(m => m.value === modelValue)
      if (model) {
        set({ 
          selectedModel: model.value,
          reasoningModel: model.reasoningModel,
          inputCost: model.inputCost,
          outputCost: model.outputCost
        })
      }
    },
  }))

  export default function ModelSelector() {
    const { selectedModel, setSelectedModel, reasoningModel } = useModelStore()
    
    return (
      <Select value={selectedModel} onValueChange={setSelectedModel}>
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
  