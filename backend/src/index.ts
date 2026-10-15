import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { logger } from "./services/logger";
import { errorHandler } from "./middleware/errorHandler";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { ticketsRouter } from "./routes/tickets";
import { usersRouter } from "./routes/users";
import { dashboardRouter } from "./routes/dashboard";
import { eventsRouter } from "./routes/events";
import { aiRouter } from "./routes/ai";
import { notificationsRouter } from "./routes/notifications";
import { authenticateJWT } from "./middleware/auth";

const app = express();
const PORT = parseInt(process.env.PORT ?? "4000", 10);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    // Allow Vite dev server in development
    contentSecurityPolicy:
      process.env.NODE_ENV === "development" ? false : undefined,
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Idempotency-Key"],
  })
);

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

// ── Structured logging ────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(pinoHttp({ logger }));
}

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "test" ? 10000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/tickets", authenticateJWT, ticketsRouter);
app.use("/api/users", authenticateJWT, usersRouter);
app.use("/api/dashboard", authenticateJWT, dashboardRouter);
app.use("/api/events", eventsRouter); // requireAuth applied inside the handler

// Placeholder routes — filled in during Phase 6
// app.use("/api/ai", aiRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, "HelpDesk 360 backend started");
  });
}

export { app };

