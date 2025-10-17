import dotenv from "dotenv";

// Load environment variables based on node environment
if (process.env.NODE_ENV === "production") {
  const cfg = `./.env.${process.env.NODE_ENV}`;
  dotenv.config({ path: cfg });
} else {
  dotenv.config();
}

export default {
  // Server Configuration
  PORT: parseInt(process.env.PORT || "8080", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Database
  DB: process.env.DATABASE_URL,
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  
  // CORS Configuration
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS, // Comma-separated list
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === "true" || true,
  
  // Email Configuration
  MAILER: {
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_PASSWORD: process.env.GMAIL_PASSWORD,
    HOST: process.env.MAILER_HOST || "smtp.gmail.com",
    PORT: parseInt(process.env.MAILER_PORT || "587", 10),
    SECURE: process.env.MAILER_SECURE === "true" || false,
    FROM_EMAIL: process.env.FROM_EMAIL || process.env.GMAIL_USER,
    FROM_NAME: process.env.FROM_NAME || "SpectraQ Auth Service",
  },
  
  // RabbitMQ Configuration
  RABBITMQ_URL: process.env.RABBITMQ_URL || "amqp://localhost:5672",
  RABBITMQ_RETRY_ATTEMPTS: parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS || "3", 10),
  RABBITMQ_RETRY_DELAY: parseInt(process.env.RABBITMQ_RETRY_DELAY || "5000", 10),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  OTP_EXPIRES_MINUTES: parseInt(process.env.OTP_EXPIRES_MINUTES || "5", 10),
  RESET_TOKEN_EXPIRES_HOURS: parseInt(process.env.RESET_TOKEN_EXPIRES_HOURS || "1", 10),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_FORMAT: process.env.LOG_FORMAT || "combined",
  
  // API Configuration
  API_VERSION: process.env.API_VERSION || "v1",
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10),
  
  // File Upload (if needed)
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || "10mb",
  UPLOAD_PATH: process.env.UPLOAD_PATH || "./uploads",
  
  // Health Check
  HEALTH_CHECK_INTERVAL_MS: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || "30000", 10),
};