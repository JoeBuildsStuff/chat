"use server";

import OpenAI from "openai";

export async function generateChatTitle(userPrompt: string): Promise<{ title: string }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate a concise and descriptive title (3-4 words max) for the following conversation. Only return the title and nothing else.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const title = response.choices[0].message.content?.trim() ?? "New Chat";
    return { title };
  } catch (error) {
    console.error("Error generating title:", error);
    return { title: "New Chat" };
  }
}
