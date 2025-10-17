import { sendMail } from '../../utils/emails/sendMail';
import {
  EmailTemplateType,
  TemplateMapType,
} from '../../utils/emails/templates';

interface EmailJob<T extends EmailTemplateType = EmailTemplateType> {
  to: string; // email
  templateType: T;
  data: TemplateMapType[T];
}

export async function handleEmailEvent(message: EmailJob) {
  const { to, templateType, data } = message;

  if (!to || !templateType || !data) {
    console.warn('Incomplete email job payload:', message);
    return;
  }

  try {
    await sendMail(to, templateType, data);
    console.log(`Email sent successfully to ${to} [${templateType}]`);
  } catch (err) {
    console.error('Failed to send email:', err);
    throw err;
  }
}
