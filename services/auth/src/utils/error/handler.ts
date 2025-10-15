import { Request, Response, NextFunction } from 'express';
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
} from './error';
import { logger } from '../logger';

export const HandleErrorWithLogger = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let reportError = true;
  let status = 500;
  let data = error.message;

  [
    NotFoundError,
    ValidationError,
    ForbiddenError,
    UnauthorizedError,
    ConflictError,
    UnprocessableEntityError,
    RequestTimeoutError,
    TooManyRequestsError,
  ].forEach((typeOfError) => {
    if (error instanceof typeOfError) {
      reportError = false;
      status = error.status;
      data = error.message;
    }
  });
  if (error instanceof APIError) {
    const apiError = error as any;
    const apiStatus = apiError.status;
    const errorData = apiError.name?.error;
    if (apiStatus && errorData) {
      status = apiStatus;
      data = errorData;
    }
  }
  if (reportError) {
    // error reporting tools implementation eg: Cloudwatch,Sentry etc;
    logger.error(error);
  } else {
    logger.warn(error); // ignore common errors caused by user
  }
  return res.status(status).json({ error: data });
};

export const HandleUnCaughtException = async (error: Error) => {
  logger.error(error);
  process.exit(1);
};
