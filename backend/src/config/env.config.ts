import { getEnv } from "../utils/get-env";

const requireStrongSecret = (key: string, nodeEnv: string): string => {
  const value = getEnv(key).trim();
  if (!value) {
    throw new Error(`Environment variable ${key} must not be empty`);
  }
  if (nodeEnv === "production" && value.length < 32) {
    throw new Error(
      `Environment variable ${key} must be at least 32 characters in production`
    );
  }
  return value;
};

const envConfig = () => {
  const NODE_ENV = getEnv("NODE_ENV", "development");

  return {
    NODE_ENV,

    PORT: getEnv("PORT", "8000"),
    BASE_PATH: getEnv("BASE_PATH", "/api"),
    MONGO_URI: getEnv("MONGO_URI"),

    JWT_SECRET: requireStrongSecret("JWT_SECRET", NODE_ENV),
    JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m") as string,

    JWT_REFRESH_SECRET: requireStrongSecret("JWT_REFRESH_SECRET", NODE_ENV),
    JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "7d") as string,

    GEMINI_API_KEY: getEnv("GEMINI_API_KEY", ""),

    CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME", ""),
    CLOUDINARY_API_KEY: getEnv("CLOUDINARY_API_KEY", ""),
    CLOUDINARY_API_SECRET: getEnv("CLOUDINARY_API_SECRET", ""),

    // Resend Email Service (Primary)
    RESEND_API_KEY: getEnv("RESEND_API_KEY", ""),
    RESEND_MAILER_SENDER: getEnv("RESEND_MAILER_SENDER", "onboarding@resend.dev"),

    // Nodemailer SMTP Service (Fallback)
    SMTP_HOST: getEnv("SMTP_HOST", "smtp.gmail.com"),
    SMTP_PORT: getEnv("SMTP_PORT", "587"),
    SMTP_USER: getEnv("SMTP_USER", ""),
    SMTP_PASS: getEnv("SMTP_PASS", ""),
    SMTP_SENDER: getEnv("SMTP_SENDER", ""),

    FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),

    GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID", ""),

    // Telegram Bot Token
    TELEGRAM_BOT_TOKEN: getEnv("TELEGRAM_BOT_TOKEN", ""),

    // Self-Ping Keep-Alive URL (e.g., https://your-backend.onrender.com)
    SERVER_URL: getEnv("SERVER_URL", ""),

    DISABLE_CRONS: getEnv("DISABLE_CRONS", "false") === "true",
    USE_GOOGLE_DNS: getEnv("USE_GOOGLE_DNS", "false") === "true",
  };
};

export const Env = envConfig();
