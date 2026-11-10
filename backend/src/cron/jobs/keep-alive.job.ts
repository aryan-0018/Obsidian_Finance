import { Env } from "../../config/env.config";

/**
 * Self-ping job to prevent cloud hosting platforms (such as Render, Railway, Fly)
 * from spinning down the container due to 15-minute inactivity timers.
 */
export const processKeepAliveJob = async (): Promise<void> => {
  const serverUrl = Env.SERVER_URL?.trim();
  if (!serverUrl) {
    return;
  }

  const normalizedUrl = serverUrl.replace(/\/+$/, "");
  const targetUrl = `${normalizedUrl}/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "ObsidianFinance-KeepAlive/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`[KeepAlive] Ping successful: ${targetUrl} (${response.status})`);
    } else {
      console.warn(`[KeepAlive] Ping returned status ${response.status} from ${targetUrl}`);
    }
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.warn(`[KeepAlive] Ping timed out for ${targetUrl}`);
    } else {
      console.warn(`[KeepAlive] Ping failed for ${targetUrl}:`, error?.message || error);
    }
  }
};

