
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

// Always use named parameter for apiKey and use process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const sendMessageToGemini = async (
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  personaName: string
) => {
  // Use ai.models.generateContent directly to query GenAI with both model and prompt
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: `${SYSTEM_PROMPT}\nYou are now acting as ${personaName}.`,
      temperature: 0.9,
    }
  });

  // Access the .text property directly
  return response.text;
};

export const getSmartReplies = async (context: string) => {
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on the following conversation context, provide 3 short, natural-sounding suggested replies in a JSON array: "${context}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        }
      }
    }
  });
  
  try {
    // Use .text property to extract response string
    const text = response.text;
    return JSON.parse(text || '[]');
  } catch (e) {
    return [];
  }
};

export const summarizeConversation = async (conversation: string) => {
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize this chat history in 3 bullet points: \n\n${conversation}`,
  });
  // Use .text property to extract response string
  return response.text;
};
