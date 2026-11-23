import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

export const smsWebhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many SMS ingestion requests. Please slow down.",
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "AI request rate limit reached. Please wait a moment and retry.",
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many file upload requests. Please try again later.",
  },
});
