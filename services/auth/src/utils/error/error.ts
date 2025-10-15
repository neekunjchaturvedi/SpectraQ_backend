import { STATUS_CODES } from './status-codes';

class BaseError extends Error {
  public readonly name: string;
  public readonly status: number;
  public readonly message: string;

  constructor(name: string, status: number, description: string) {
    super(description);
    this.name = name;
    this.status = status;
    this.message = description;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

// 500 Internal Error
export class APIError extends BaseError {
  constructor(err: any) {
    if (typeof err === 'string') {
      super(err, STATUS_CODES.INTERNAL_ERROR, err);
      return;
    }
    let error = err.response;
    super(error.data, error.status, error.data);
  }
}
// 400 Validation Error
export class ValidationError extends BaseError {
  constructor(description = 'Bad request') {
    super('Bad Request', STATUS_CODES.BAD_REQUEST, description);
  }
}

// 403 Authorization Error
export class ForbiddenError extends BaseError {
  constructor(description = 'Access denied') {
    super('Access Denied', STATUS_CODES.UN_AUTHORISED, description);
  }
}

// 404 Not Found
export class NotFoundError extends BaseError {
  constructor(description = 'Not found') {
    super('Not Found', STATUS_CODES.NOT_FOUND, description);
  }
}

// 401 Unauthorized Error
export class UnauthorizedError extends BaseError {
  constructor(description = 'Unauthorized access') {
    super('Unauthorized', STATUS_CODES.UN_AUTHORISED, description);
  }
}

// 409 Conflict Error
export class ConflictError extends BaseError {
  constructor(description = 'Resource conflict') {
    super('Conflict', STATUS_CODES.CONFLICT, description);
  }
}

// 422 Unprocessable Entity Error
export class UnprocessableEntityError extends BaseError {
  constructor(description = 'Unprocessable entity') {
    super(
      'Unprocessable Entity',
      STATUS_CODES.UNPROCESSABLE_ENTITY,
      description
    );
  }
}

// 408 Request Timeout Error
export class RequestTimeoutError extends BaseError {
  constructor(description = 'Request timeout') {
    super('Request Timeout', STATUS_CODES.REQUEST_TIMEOUT, description);
  }
}

// 429 Too Many Requests Error
export class TooManyRequestsError extends BaseError {
  constructor(description = 'Too many requests') {
    super('Too Many Requests', STATUS_CODES.TOO_MANY_REQUESTS, description);
  }
}
