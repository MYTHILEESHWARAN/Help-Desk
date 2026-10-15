import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middleware/validate";
import { LoginSchema } from "../lib/schemas";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createHttpError } from "../middleware/errorHandler";

export const authRouter = Router();

// Rate-limit login: 5 attempts per minute per IP
// Disabled in test environment to avoid rate-limit interference between tests
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 5,
  message: { message: "Too many login attempts. Please wait a minute and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
authRouter.post(
  "/login",
  loginLimiter,
  validateBody(LoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      const user = await prisma.user.findUnique({ where: { username } });

      // Use constant-time comparison even when user not found (prevent enumeration)
      const dummyHash = "$2b$12$invalidhashfortimingprotection000000000000000000000000000";
      const isValid = user
        ? await bcrypt.compare(password, user.password_hash)
        : await bcrypt.compare(password, dummyHash).then(() => false);

      if (!user || !isValid) {
        throw createHttpError(401, "Invalid username or password");
      }

      const secret = process.env.JWT_SECRET!;
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          full_name: user.full_name,
        },
        secret,
        { expiresIn: "8h" }
      );

      res
        .cookie("token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 8 * 60 * 60 * 1000, // 8 hours
        })
        .json({
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
authRouter.post("/logout", (_req: Request, res: Response) => {
  res
    .clearCookie("token", { httpOnly: true, sameSite: "lax" })
    .json({ message: "Logged out" });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
authRouter.get(
  "/me",
  requireAuth,
  (req: Request, res: Response) => {
    const user = req.user!;
    res.json({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    });
  }
);
