import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config";
import authRoutes from "./api/routes/authroutes";
import { startEmailConsumer } from "./messaging/consumer";
import { initMailer } from "./utils/emails/sendMail";

const app = express();

app.use(
  cors({
    origin: config.ALLOWED_ORIGINS,
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/v1", (req: Request, res: Response) => {
  res.status(200).json({ message: "Welcome to the Auth API! 👋" });
});
app.use("/api/v1/auth", authRoutes);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Welcome to the Auth API! 👋" });
});

app.listen(config.PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${config.PORT}`);
  try {
    initMailer();
    console.log("Mailer initialized");
  } catch (err) {
    console.error("Mailer failed to initialize; exiting.", err);
    process.exit(1);
  }

  startEmailConsumer().catch((err) => {
    console.error("Failed to start email consumer", err);
    process.exit(1);
  });
});
