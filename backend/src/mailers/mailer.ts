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
  let resendError: any = null;

  // 1. Primary: Resend API
  if (Env.RESEND_API_KEY) {
    try {
      const resendSender =
        from ||
        (Env.RESEND_MAILER_SENDER.includes("<")
          ? Env.RESEND_MAILER_SENDER
          : `Obsidian Finance <${Env.RESEND_MAILER_SENDER}>`);

      const resendResult = await resend.emails.send({
        from: resendSender,
        to: recipientList,
        subject,
        text,
        html,
        attachments: attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      if (resendResult.error) {
        resendError = resendResult.error;
        console.warn(
          `[Mailer] Primary delivery via Resend failed (${resendResult.error.name || "Error"}: ${resendResult.error.message}). Attempting fallback to Nodemailer SMTP...`
        );
      } else {
        console.log(`[Mailer] Successfully dispatched email via Resend (id: ${resendResult.data?.id})`);
        return resendResult;
      }
    } catch (err: any) {
      resendError = err;
      console.warn(
        `[Mailer] Primary delivery via Resend threw an exception (${err.message}). Attempting fallback to Nodemailer SMTP...`
      );
    }
  } else {
    console.log("[Mailer] RESEND_API_KEY not configured. Falling back to Nodemailer SMTP...");
  }

  // 2. Fallback: Nodemailer SMTP
  if (Env.SMTP_USER && Env.SMTP_PASS) {
    try {
      const smtpSender =
        from ||
        Env.SMTP_SENDER ||
        `"Obsidian Finance" <${Env.SMTP_USER}>`;

      const mailOptions = {
        from: smtpSender,
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

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Mailer] Fallback delivery via Nodemailer SMTP succeeded (messageId: ${info.messageId})`);
      return info;
    } catch (smtpErr: any) {
      console.error(`[Mailer] Fallback delivery via Nodemailer SMTP also failed: ${smtpErr.message}`);
      throw new Error(
        `Email delivery failed. Primary (Resend): ${resendError?.message || "Not configured"}. Fallback (Nodemailer SMTP): ${smtpErr.message}`
      );
    }
  }

  // If neither service succeeded or was available
  if (resendError) {
    throw new Error(
      `Email delivery failed via primary service (Resend): ${resendError.message}. Fallback (Nodemailer SMTP) is not configured (missing SMTP_USER/SMTP_PASS).`
    );
  }

  throw new Error(
    "No email service configured. Please provide RESEND_API_KEY (primary) or SMTP credentials (fallback)."
  );
};
