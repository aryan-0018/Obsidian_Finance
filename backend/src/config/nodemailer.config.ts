import nodemailer from "nodemailer";
import { Env } from "./env.config";

export const transporter = nodemailer.createTransport({
  host: Env.SMTP_HOST || "smtp.gmail.com",
  port: Number(Env.SMTP_PORT) || 587,
  secure: Number(Env.SMTP_PORT) === 465, // true for 465, false for 587
  auth: {
    user: Env.SMTP_USER,
    pass: Env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 10000, // 10s to establish connection
  greetingTimeout: 10000,   // 10s greeting timeout
  socketTimeout: 15000,     // 15s socket activity timeout
});

