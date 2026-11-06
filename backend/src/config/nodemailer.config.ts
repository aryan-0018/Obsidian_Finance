import nodemailer from "nodemailer";
import { Env } from "./env.config";

export const transporter = nodemailer.createTransport({
  host: Env.SMTP_HOST,
  port: Number(Env.SMTP_PORT) || 587,
  secure: Number(Env.SMTP_PORT) === 465, // true for 465, false for 587 or others
  auth: {
    user: Env.SMTP_USER,
    pass: Env.SMTP_PASS,
  },
});

