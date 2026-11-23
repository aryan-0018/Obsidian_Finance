import { Resend } from "resend";
import { Env } from "./env.config";

export const resend: Resend | null = Env.RESEND_API_KEY
  ? new Resend(Env.RESEND_API_KEY)
  : null;
