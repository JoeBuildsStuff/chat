import { create } from "zustand";

export interface Message {
  role: "user" | "assistant";
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;
}

interface ChatStore {
  messages: Message[];
  setMessages: (messages: Message[] | ((prevMessages: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  setMessages: (messages) => set((state) => ({
    messages: typeof messages === 'function' ? messages(state.messages) : messages
  })),
  addMessage: (message) => 
    set((state) => ({ messages: [...state.messages, message] })),
  resetChat: () => set({ messages: [] }),
}));