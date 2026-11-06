import { Env } from "../config/env.config";
import { transporter } from "../config/nodemailer.config";
import { resend } from "../config/resend.config";

type Params = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
  attachments?: { filename: string; content: string | Buffer; contentType?: string }[];
};

export const sendEmail = async ({
  to,
  from,
  subject,
  text,
  html,
  attachments,
}: Params) => {
  const recipientList = Array.isArray(to) ? to : [to];

  // 1. Primary: Nodemailer SMTP
  if (Env.SMTP_USER && Env.SMTP_PASS) {
    const sender =
      from ||
      Env.SMTP_SENDER ||
      `"Obsidian Finance" <${Env.SMTP_USER}>`;

    const mailOptions = {
      from: sender,
      to: recipientList.join(", "),
      subject,
      text,
      html,
      attachments: attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    };

    return await transporter.sendMail(mailOptions);
  }

  // 2. Secondary / Fallback: Resend API
  if (Env.RESEND_API_KEY) {
    const resendSender =
      from || `ObsidianFinance <${Env.RESEND_MAILER_SENDER}>`;

    return await resend.emails.send({
      from: resendSender,
      to: recipientList,
      text,
      subject,
      html,
      attachments,
    });
  }

  throw new Error("No email service configured. Please provide SMTP credentials or a RESEND_API_KEY.");
};
