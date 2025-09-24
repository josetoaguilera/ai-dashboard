import { PrismaClient } from "@prisma/client";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createClient } from "redis";
import winston from "winston";

// Load environment variables
dotenv.config({ path: "../.env" });

// Routes
import analyticsRoutes from "./routes/analytics";
import authRoutes from "./routes/auth";
import configRoutes from "./routes/config";
import conversationRoutes from "./routes/conversations";
import messageRoutes from "./routes/messages";

// Initialize
const app = express();
const prisma = new PrismaClient();

// Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" }),
  ],
});

// Redis client
const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // More permissive limit for development (1000 requests per 15 minutes)
  message: "Too many requests, please try again later.",
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// More permissive rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per 15 minutes per IP
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(compression());
// Apply rate limiting only in production
if (process.env.NODE_ENV === "production") {
  app.use(limiter);
}
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// API Routes
// Apply auth rate limiting only in production
if (process.env.NODE_ENV === "production") {
  app.use("/api/auth", authLimiter, authRoutes);
} else {
  app.use("/api/auth", authRoutes);
}
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/config", configRoutes);

// Error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to Redis (optional in development)
    try {
      await redis.connect();
      logger.info("Connected to Redis");
    } catch (error) {
      logger.warn(
        "Redis connection failed, continuing without Redis:",
        error instanceof Error ? error.message : String(error)
      );
    }

    // Test database connection (optional in development)
    try {
      await prisma.$connect();
      logger.info("Connected to database");
    } catch (error) {
      logger.warn(
        "Database connection failed, continuing without database:",
        error instanceof Error ? error.message : String(error)
      );
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

startServer();

export { logger, prisma, redis };
