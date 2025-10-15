export type EmailTemplateType = "OTP" | "WELCOME" | "RESET_PASSWORD";

type TemplateMap = {
  OTP: { name: string; otp: string };
  WELCOME: { name: string };
  RESET_PASSWORD: { link: string };
};

export const mailTemplates: {
  [K in keyof TemplateMap]: (data: TemplateMap[K]) => {
    subject: string;
    body: string;
  };
} = {
  OTP: ({ name, otp }) => ({
    subject: "Your OTP for Verification",
    body: `Dear ${name},

Your One-Time Password (OTP) for verifying your account is: ${otp}.

Please enter this code to complete the verification process. This code is valid for 5 minutes.

If you did not request this, please ignore this email.

Best regards,  
Outceedo Team`,
  }),

  WELCOME: ({ name }) => ({
    subject: "Welcome to Outceedo!",
    body: `Hi ${name},

Welcome aboard! We're thrilled to have you with us.

Cheers,  
Outceedo Team`,
  }),

  RESET_PASSWORD: ({ link }) => ({
    subject: "Reset Your Password",
    body: `Click the following link to reset your password: ${link}

If you didn't request this, ignore the email.`,
  }),
};

export type TemplateMapType = TemplateMap;
