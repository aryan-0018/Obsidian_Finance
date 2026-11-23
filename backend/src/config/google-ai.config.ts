import { GoogleGenAI } from "@google/genai";
import { Env } from "./env.config";

export const genAI = Env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: Env.GEMINI_API_KEY })
  : null;
export const genAIModel = "gemini-flash-lite-latest";

const MODELS_PRIORITY = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
];

const NO_THINKING_MODELS = new Set([
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
]);

export async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
  timeoutMs?: number;
  perAttemptTimeoutMs?: number;
}) {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const totalTimeoutMs = params.timeoutMs || 28000;
  const maxPerAttemptMs = params.perAttemptTimeoutMs || 11000;
  const deadline = Date.now() + totalTimeoutMs;
  let lastError: any = null;

  for (const model of MODELS_PRIORITY) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 150) {
        throw (
          lastError ||
          new Error(`Gemini request timed out after ${totalTimeoutMs}ms`)
        );
      }

      const attemptBudgetMs = Math.min(remainingMs, maxPerAttemptMs);
      const effectiveConfig =
        NO_THINKING_MODELS.has(model) && !params.config?.thinkingConfig
          ? { ...(params.config || {}), thinkingConfig: { thinkingBudget: 0 } }
          : params.config;

      let timer: NodeJS.Timeout | null = null;
      try {
        const responsePromise = genAI.models.generateContent({
          model,
          contents: params.contents,
          config: effectiveConfig,
        });

        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  `Model ${model} request timed out after ${attemptBudgetMs}ms`
                )
              ),
            attemptBudgetMs
          );
        });

        const response: any = await Promise.race([
          responsePromise,
          timeoutPromise,
        ]);
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        const isClientAuthError = status === 400 || status === 401 || status === 403;
        if (isClientAuthError) {
          throw err;
        }

        const isUnavailable =
          status === 503 ||
          err?.message?.includes("503") ||
          err?.message?.includes("high demand");

        if (isUnavailable && attempt === 0 && deadline - Date.now() > 900) {
          const jitter = 350 + Math.floor(Math.random() * 450);
          await new Promise((resolve) => setTimeout(resolve, jitter));
          continue;
        }
        break; // Switch immediately to next model on 429, timeout, or second failure
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }

  throw lastError;
}
