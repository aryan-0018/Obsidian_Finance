import { Env } from "../config/env.config";
import { resend } from "../config/resend.config";

type Params = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
  attachments?: { filename: string; content: string | Buffer }[];
};

export const sendEmail = async ({
  to,
  from,
  subject,
  text,
  html,
  attachments,
}: Params) => {
  if (!Env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resendSender = `ObsidianFinance <${Env.RESEND_MAILER_SENDER}>`;

  const response = await resend.emails.send({
    from: from || resendSender,
    to: Array.isArray(to) ? to : [to],
    text,
    subject,
    html,
    attachments,
  });

  return response;
};
