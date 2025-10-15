import nodemailer from "nodemailer";
import config from "../../config";
import { APIError } from "../error";
import { mailTemplates, EmailTemplateType, TemplateMapType } from "./templates";

export const sendMail = async <T extends EmailTemplateType>(
  email: string,
  templateType: T,
  data: TemplateMapType[T]
) => {
  try {
    const { subject, body } = mailTemplates[templateType](data);

    const transport = nodemailer.createTransport({
      port: Number(config.MAILER.PORT),
      host: config.MAILER.HOST,
      secure: Boolean(config.MAILER.SECURE),
      auth: {
        user: config.MAILER.GMAIL_USER,
        pass: config.MAILER.GMAIL_PASSWORD,
      },
    });

    await transport.sendMail({
      from: `"Outceedo" <${config.MAILER.GMAIL_USER}>`,
      to: email,
      subject,
      text: body,
    });
  } catch (error) {
    console.error("Email sending error:", error);
    throw new APIError("Failed to send email");
  }
};
