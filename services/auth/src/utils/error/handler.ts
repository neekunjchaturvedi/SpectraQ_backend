import { Request, Response, NextFunction } from "express";
import {
  APIError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RequestTimeoutError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
  ValidationError,
} from "./error";
import { logger } from "../logger";

interface ErrorResponse {
  success: false;
  error: {
    name: string;
    message: string;
    status: number;
    timestamp: string;
    path: string;
    requestId?: string;
  };
  stack?: string;
}

export const HandleErrorWithLogger = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Don't process if response already sent
  if (res.headersSent) {
    return next(error);
  }

  let reportError = true;
  let status = 500;
  let errorName = "Internal Server Error";
  let errorMessage = error.message || "Something went wrong";

  // Handle known custom errors
  const knownErrors = [
    NotFoundError,
    ValidationError,
    ForbiddenError,
    UnauthorizedError,
    ConflictError,
    UnprocessableEntityError,
    RequestTimeoutError,
    TooManyRequestsError,
  ];

  for (const ErrorType of knownErrors) {
    if (error instanceof ErrorType) {
      reportError = false;
      status = error.status;
      errorName = error.name;
      errorMessage = error.message;
      break;
    }
  }

  // Handle APIError specially
  if (error instanceof APIError) {
    const apiError = error as any;
    status = apiError.status || 500;
    errorName = apiError.name || "API Error";
    errorMessage = apiError.message || "Internal server error";
    reportError = status >= 500; // Only report server errors, not client errors
  }

  // Handle Prisma/Database errors
  if (error.name === "PrismaClientKnownRequestError") {
    status = 400;
    errorName = "Database Error";
    errorMessage = "Database operation failed";
    reportError = false;
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    status = 401;
    errorName = "Invalid Token";
    errorMessage = "Authentication token is invalid";
    reportError = false;
  }

  if (error.name === "TokenExpiredError") {
    status = 401;
    errorName = "Token Expired";
    errorMessage = "Authentication token has expired";
    reportError = false;
  }

  // Handle validation errors from express-validator or similar
  if (error.name === "ValidationError" && !reportError) {
    status = 400;
    errorName = "Validation Error";
  }

  // Generate request ID for tracking
  const requestId =
    (req.headers["x-request-id"] as string) ||
    Math.random().toString(36).substring(2, 15);

  // Structured error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      name: errorName,
      message: errorMessage,
      status: status,
      timestamp: new Date().toISOString(),
      path: req.originalUrl || req.url,
      requestId: requestId,
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = error.stack;
  }

  // Log errors appropriately
  const logContext = {
    error: errorName,
    message: errorMessage,
    status: status,
    path: req.originalUrl || req.url,
    method: req.method,
    requestId: requestId,
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection.remoteAddress,
  };

  if (reportError) {
    // Log server errors with full context
    logger.error(
      {
        ...logContext,
        stack: error.stack,
      },
      "Server Error Occurred"
    );
  } else {
    // Log client errors as warnings
    logger.warn(logContext, "Client Error Occurred");
  }

  // Send JSON error response
  res.status(status).json(errorResponse);
};

// Handle 404 for undefined routes
export const HandleNotFound = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId =
    (req.headers["x-request-id"] as string) ||
    Math.random().toString(36).substring(2, 15);

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      name: "Not Found",
      message: `Route ${req.method} ${req.originalUrl} not found`,
      status: 404,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      requestId: requestId,
    },
  };

  logger.warn(
    {
      path: req.originalUrl,
      method: req.method,
      requestId: requestId,
      ip: req.ip || req.connection.remoteAddress,
    },
    "Route Not Found"
  );

  res.status(404).json(errorResponse);
};

export const HandleUnCaughtException = async (error: Error): Promise<void> => {
  logger.error(
    {
      error: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    },
    "Uncaught Exception"
  );

  // Give some time for logs to be written
  setTimeout(() => {
    process.exit(1);
  }, 1000);
};

// Handle unhandled promise rejections
export const HandleUnhandledRejection = async (
  reason: any,
  promise: Promise<any>
): Promise<void> => {
  logger.error(
    {
      reason: reason,
      promise: promise.toString(),
      timestamp: new Date().toISOString(),
    },
    "Unhandled Promise Rejection"
  );

  // Give some time for logs to be written
  setTimeout(() => {
    process.exit(1);
  }, 1000);
};
