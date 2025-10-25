import nodemailer from "nodemailer";
import config from "../../config";
import { APIError } from "../error";
import { mailTemplates, EmailTemplateType, TemplateMapType } from "./templates";

let transporter: nodemailer.Transporter | null = null;

function ensureMailerConfig() {
  if (
    !config.MAILER ||
    !config.MAILER.HOST ||
    !config.MAILER.PORT ||
    !config.MAILER.GMAIL_USER ||
    !config.MAILER.GMAIL_PASSWORD
  ) {
    throw new APIError(
      "SMTP configuration missing. Please set MAILER.* env vars"
    );
  }
}

export async function initMailer(): Promise<void> {
  ensureMailerConfig();
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.MAILER.HOST,
      port: Number(config.MAILER.PORT) || 587,
      secure: Boolean(config.MAILER.SECURE),
      auth: {
        user: config.MAILER.GMAIL_USER,
        pass: config.MAILER.GMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  try {
    await transporter.verify();
    console.info("✅ SMTP transporter verified");
  } catch (err) {
    console.error("❌ SMTP verification failed", err);
    throw err;
  }
}

export const sendMail = async <T extends EmailTemplateType>(
  email: string,
  templateType: T,
  data: TemplateMapType[T]
) => {
  try {
    if (!transporter) {
      await initMailer();
    }

    const { subject, body } = mailTemplates[templateType](data);
    const from = `"Outceedo" <${config.MAILER.GMAIL_USER}>`;

    const info = await transporter!.sendMail({
      from,
      to: email,
      subject,
      text: body,
    });

    return info;
  } catch (error: any) {
    console.error("Email sending error:", error);
    throw new APIError(`Failed to send email: ${error?.message || error}`);
  }
};
