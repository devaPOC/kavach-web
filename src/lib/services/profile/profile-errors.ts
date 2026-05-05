import { BaseError } from '../../errors/custom-errors';
import { ErrorCode } from '../../errors/error-types';

export class ProfileError extends BaseError {
  public statusCode: number;

  constructor(message: string, code: string, requestId?: string) {
    // Map profile error codes to standard error codes
    const errorCode = mapProfileErrorCode(code);
    const statusCode = getStatusCodeForProfileError(code);

    super(
      errorCode,
      message,
      undefined, // field
      undefined, // details
      requestId
    );

    this.name = 'ProfileError';
    this.statusCode = statusCode;
  }
}

// Helper function to map profile error codes to standard error codes
function mapProfileErrorCode(code: string): ErrorCode {
  switch (code) {
    case 'VALIDATION_ERROR':
      return ErrorCode.VALIDATION_ERROR;
    case 'USER_NOT_FOUND':
      return ErrorCode.RESOURCE_NOT_FOUND;
    case 'PROFILE_EXISTS':
      return ErrorCode.RESOURCE_ALREADY_EXISTS;
    case 'PROFILE_NOT_FOUND':
      return ErrorCode.RESOURCE_NOT_FOUND;
    case 'PROFILE_CREATION_FAILED':
    case 'PROFILE_UPDATE_FAILED':
    case 'PROFILE_DELETION_FAILED':
    case 'PROFILE_APPROVAL_FAILED':
    case 'PROFILE_REJECTION_FAILED':
      return ErrorCode.DATABASE_OPERATION_FAILED;
    default:
      return ErrorCode.INTERNAL_SERVER_ERROR;
  }
}

// Helper function to get HTTP status code for profile errors
function getStatusCodeForProfileError(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'USER_NOT_FOUND':
    case 'PROFILE_NOT_FOUND':
      return 404;
    case 'PROFILE_EXISTS':
      return 409;
    case 'PROFILE_CREATION_FAILED':
    case 'PROFILE_UPDATE_FAILED':
    case 'PROFILE_DELETION_FAILED':
    case 'PROFILE_APPROVAL_FAILED':
    case 'PROFILE_REJECTION_FAILED':
    default:
      return 500;
  }
}
