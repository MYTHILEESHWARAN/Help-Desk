import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "../services/logger";

/**
 * Global error handler middleware.
 * Maps known error types to appropriate HTTP responses.
 * Never leaks stack traces in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // next is required by Express for error handler signature
  _next: NextFunction
): void {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Prisma unique constraint violation → 409
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    res.status(409).json({ message: "A record with that value already exists." });
    return;
  }

  // Prisma record not found → 404
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2025"
  ) {
    res.status(404).json({ message: "Record not found." });
    return;
  }

  // Prisma validation error → 400
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ message: "Invalid data supplied to the database." });
    return;
  }

  // HTTP errors with a statusCode attached (thrown manually)
  if (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    "message" in err
  ) {
    const httpErr = err as { statusCode: number; message: string };
    res.status(httpErr.statusCode).json({ message: httpErr.message });
    return;
  }

  // Unknown errors → 500 (log full error, send generic message)
  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : (err instanceof Error ? err.message : String(err)),
  });
}

/** Helper: throw a structured HTTP error from a route handler */
export function createHttpError(statusCode: number, message: string): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}
