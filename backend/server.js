// --- Load env FIRST
import dotenv from "dotenv";
dotenv.config();
console.log("Loaded AI_SERVICE_URL:", process.env.AI_SERVICE_URL);

import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import interviewRoutes from "./routes/interviewRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";

import connectDB from "./config/db.js";

const app = express();

// --- Security headers (OWASP: Security Misconfiguration)
app.use(helmet({
  contentSecurityPolicy: false, // APIs don’t need CSP
  crossOriginEmbedderPolicy: false
}));

// --- CORS (restrict to your frontend) (OWASP: Access Control)
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-API-Key"],
  optionsSuccessStatus: 204
}));

// --- Rate limit (OWASP: DoS)
// Scoped only for interview routes (LLM-heavy)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 req/min per IP
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/interview", limiter);

// --- Body parser with size limits (OWASP: Input Validation)
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false, limit: "200kb" }));

// --- Compression & logging
app.use(compression());
app.use(morgan("combined", {
  skip: (req) => req.headers["authorization"] || req.headers["x-api-key"]
}));

// --- Routes
app.get("/", (_req, res) => res.send("API is up"));
app.use("/api/auth", authRoutes);
app.use("/api/interview", interviewRoutes);

// --- 404 and central error handler (OWASP: Error Handling & Logging)
app.use(notFoundHandler);
app.use(errorHandler);

// --- Start server only after DB connects
const port = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
}).catch((err) => {
  console.error("❌ Failed to connect to DB", err);
  process.exit(1);
});
