import type { NextApiRequest, NextApiResponse } from "next";
import { attachRequestId, getOrGenerateRequestId, logger } from "@/lib/logger";

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationIssue[];
}

export interface Validator<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } };
}

/**
 * Validate input using a schema (Zod-compatible or lightweight custom schema).
 */
export function validate<T>(validator: Validator<T>, input: unknown): ValidationResult<T> {
  const result = validator.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ValidationIssue[] = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));

  return { success: false, errors };
}

/**
 * Cleanly handle validation errors by responding with standard client-safe 400 JSON.
 * Does not leak internal errors, database names, or secrets.
 */
export function sendValidationError(
  res: NextApiResponse,
  errors: ValidationIssue[] | string,
  requestId?: string
): void {
  const formattedErrors = typeof errors === "string" ? [{ field: "root", message: errors }] : errors;

  if (requestId) {
    attachRequestId(res, requestId);
  }

  res.status(400).json({
    error: "Validation failed",
    code: "VALIDATION_ERROR",
    details: formattedErrors,
  });
}

/**
 * Higher-order request handler wrapper that ensures:
 * 1. Request ID is extracted/generated and attached to X-Request-ID response header
 * 2. Structured request duration & status logging
 * 3. Centralized error catching and normalized safe responses
 */
export function withApiContext(
  routeName: string,
  handler: (req: NextApiRequest, res: NextApiResponse, ctx: { requestId: string }) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const startTime = Date.now();
    const requestId = getOrGenerateRequestId(req);
    attachRequestId(res, requestId);

    try {
      await handler(req, res, { requestId });
    } catch (error) {
      logger.error(`Unhandled error in ${routeName}`, error, {
        route: routeName,
        method: req.method,
        requestId,
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: "An unexpected error occurred. Please try again later.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    } finally {
      const durationMs = Date.now() - startTime;
      logger.info(`${req.method ?? "UNKNOWN"} ${routeName} completed`, {
        route: routeName,
        method: req.method,
        status: res.statusCode,
        durationMs,
        requestId,
      });
    }
  };
}
