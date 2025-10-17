import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config";
import authRoutes from "./api/routes/authroutes";

const app = express();

// --- Middleware ---
// Enable Cross-Origin Resource Sharing
app.use(cors());
// Enable JSON body parsing for incoming requests
app.use(express.json());

// --- API Routes ---
app.get("/api/v1", (req: Request, res: Response) => {
  res.status(200).json({ message: "Welcome to the Auth API! 👋" });
});
app.use("/api/v1/auth", authRoutes);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Welcome to the Auth API! 👋" });
});

// --- Server Initialization ---
// FIX: Pass config.PORT (the number) instead of the whole config object
app.listen(config.PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${config.PORT}`);
});
