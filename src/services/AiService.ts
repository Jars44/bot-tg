/**
 * AI Service
 * Google Gemini integration for conversational AI chat
 * Maintains conversation context history
 */

import { GoogleGenAI } from "@google/genai";
import { CONFIG, getEnvVar, ENV_KEYS } from "../config/index.js";

/** Message format for Gemini chat history */
export interface ChatMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export class AiService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = getEnvVar(ENV_KEYS.GEMINI_API_KEY);
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Chat with context history
   * @param message User's new message
   * @param history Previous conversation history
   * @returns AI response text
   */
  async chatWithContext(message: string, history: ChatMessage[]): Promise<string> {
    try {
      // Build conversation context from history
      const contents = [
        ...history.map((msg) => ({
          role: msg.role,
          parts: msg.parts,
        })),
        {
          role: "user" as const,
          parts: [{ text: message }],
        },
      ];

      // Generate response with context
      const result = await this.genAI.models.generateContent({
        model: CONFIG.AI.MODEL,
        contents,
        config: {
          maxOutputTokens: 1024,
          temperature: 0.9,
        },
      });

      const response = result.text || "";
      return response;
    } catch (error: unknown) {
      console.error("[AiService] Error:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle common errors
      if (errorMessage.includes("quota")) {
        throw new Error("API quota exceeded. Please try again later.");
      }

      if (errorMessage.includes("API key")) {
        throw new Error("API configuration error.");
      }

      throw new Error("Failed to get AI response. Please try again.");
    }
  }

  /**
   * Simple one-shot chat without history (for quick queries)
   */
  async chat(message: string): Promise<string> {
    return this.chatWithContext(message, []);
  }
}
