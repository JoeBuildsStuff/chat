import { create } from "zustand";
import { SupabaseClient } from "@supabase/supabase-js";

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
  currentChatId: string | null;
  setMessages: (messages: Message[] | ((prevMessages: Message[]) => Message[])) => void;
  setCurrentChatId: (chatId: string | null) => void;
  addMessage: (message: Message) => void;
  resetChat: () => void;
  createNewChat: (supabase: SupabaseClient) => Promise<string>;
  loadChat: (supabase: any, chatId: string) => Promise<void>;
  saveMessage: (supabase: any, message: Message) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  currentChatId: null,
  setMessages: (messages) => set((state) => ({
    messages: typeof messages === 'function' ? messages(state.messages) : messages
  })),
  setCurrentChatId: (chatId) => set({ currentChatId: chatId }),
  addMessage: (message) => 
    set((state) => ({ messages: [...state.messages, message] })),
  resetChat: () => set({ messages: [] }),
  createNewChat: async (supabase) => {
    try {
      const { data: chat, error } = await supabase
        .from('chatbot_chats')
        .insert([
          { 
            title: 'New Chat',
            // add any other required fields
          }
        ])
        .select()
        .single();

      if (error) throw error;

      set({ currentChatId: chat.id });
      return chat.id; // Return the new chat ID
    } catch (error) {
      console.error('Error creating new chat:', error);
      throw error;
    }
  },
  loadChat: async (supabase, chatId) => {
    const { data: messages, error } = await supabase
      .from('chatbot_chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at');

    if (error) throw error;
    set({ currentChatId: chatId, messages });
  },
  saveMessage: async (supabase, message) => {
    const { currentChatId } = get();
    if (!currentChatId) throw new Error('No active chat');

    const { error } = await supabase
      .from('chatbot_chat_messages')
      .insert([{
        chat_id: currentChatId,
        role: message.role,
        content: message.content,
        input_tokens: message.inputTokens,
        output_tokens: message.outputTokens,
        input_cost: message.inputCost,
        output_cost: message.outputCost,
        total_cost: message.totalCost
      }]);

    if (error) throw error;
  }
}));