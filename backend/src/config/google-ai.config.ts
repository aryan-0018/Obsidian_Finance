import { GoogleGenAI } from "@google/genai";
import { Env } from "./env.config";

export const genAI = new GoogleGenAI({ apiKey: Env.GEMINI_API_KEY });
export const genAIModel = "gemini-3.5-flash-lite";

const MODELS_PRIORITY = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

export async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
  timeoutMs?: number;
}) {
  const timeoutMs = params.timeoutMs || 8000;
  let lastError: any = null;

  for (const model of MODELS_PRIORITY) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const responsePromise = genAI.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Model ${model} request timed out after ${timeoutMs}ms`
                )
              ),
            timeoutMs
          )
        );

        const response: any = await Promise.race([
          responsePromise,
          timeoutPromise,
        ]);
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
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        break; // Try next model in priority list
      }
    }
  }

  throw lastError;
}

