import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createHttpError } from "./errorHandler";

export interface JwtPayload {
  id: string;
  username: string;
  role: string;
  email: string;
  full_name: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Reads the JWT from the httpOnly cookie, verifies it, and attaches
 * the decoded payload to req.user.
 * Returns 401 if the token is missing or invalid.
 */
export function authenticateJWT(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;

  if (!token) {
    return next(createHttpError(401, "Authentication required"));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error("JWT_SECRET is not configured"));
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(createHttpError(401, "Invalid or expired token"));
  }
}

/**
 * Middleware factory: requires the authenticated user to have the specified role.
 * Must be used after authenticateJWT.
 */
export function requireRole(role: "employee" | "technician") {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createHttpError(401, "Authentication required"));
    }
    if (req.user.role !== role) {
      return next(createHttpError(403, `This action requires the '${role}' role`));
    }
    next();
  };
}

/**
 * Middleware: requires user to be authenticated (any role).
 * Alias for authenticateJWT to keep route files readable.
 */
export const requireAuth = authenticateJWT;
