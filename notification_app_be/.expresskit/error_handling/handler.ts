import { Request, Response, NextFunction } from "express";

/**
 * ExpressKit Global Error Handler v1
 * Centralized, opinionated, production-safe
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err.name === 'ZodError') {
    const zodIssues = err.issues || err.errors || [];
    const formattedErrors = zodIssues.map((e: any) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        message: "Validation Error",
        details: formattedErrors,
      },
    });
    return;
  }

  const status = err.status || err.statusCode || 500;

  const payload = {
    success: false,
    error: {
      message:
        status === 500
          ? "Internal Server Error"
          : err.message || "Something went wrong",
      ...(process.env.NODE_ENV !== "production" && {
        stack: err.stack,
      }),
    },
  };

  res.status(status).json(payload);
}
