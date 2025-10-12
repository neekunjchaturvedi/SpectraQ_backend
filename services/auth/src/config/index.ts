import dotenv from "dotenv";

// Load environment variables based on node environment
if (process.env.NODE_ENV === "production") {
  const cfg = `./.env.${process.env.NODE_ENV}`;
  dotenv.config({ path: cfg });
} else {
  dotenv.config();
}

export default {
  PORT: parseInt(process.env.PORT || "8080", 10),
  DB: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_URL: process.env.CLIENT_URL,
  MAILER: {
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_PASSWORD: process.env.GMAIL_PASSWORD,
    HOST: process.env.MAILER_HOST,
    PORT: process.env.MAILER_PORT,
    SECURE: process.env.MAILER_SECURE,
  },
};
