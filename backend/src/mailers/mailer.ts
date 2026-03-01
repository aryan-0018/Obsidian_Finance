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

const mailer_sender = `ObsidianFinance <${Env.RESEND_MAILER_SENDER}>`;

export const sendEmail = async ({
  to,
  from = mailer_sender,
  subject,
  text,
  html,
  attachments,
}: Params) => {
  return await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    text,
    subject,
    html,
    attachments,
  });
};
