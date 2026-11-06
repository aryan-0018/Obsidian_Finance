import { GoogleGenAI } from "@google/genai";
import { Env } from "./env.config";

export const genAI = new GoogleGenAI({ apiKey: Env.GEMINI_API_KEY });
export const genAIModel = "gemini-3.5-flash-lite";

const MODELS_PRIORITY = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

export async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
}) {
  let lastError: any = null;

  for (const model of MODELS_PRIORITY) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await genAI.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.message?.includes("503") ||
          err?.message?.includes("high demand") ||
          err?.message?.includes("429");

        if (isRetryable && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break; // Try next model in priority list
      }
    }
  }

  throw lastError;
}

