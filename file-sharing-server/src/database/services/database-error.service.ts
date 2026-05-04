import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  APP_STATUS_CODES,
  DATABASE_MESSAGES,
  POSTGRES_ERROR_CODES,
} from '../../constants/app.constants';

export type PostgresDriverError = {
  code?: string;
  constraint?: string;
};

export type DatabaseErrorMetadata = {
  code: string | null;
  constraint: string | null;
  isQueryFailed: boolean;
};

@Injectable()
export class DatabaseErrorService {
  getMetadata(error: unknown): DatabaseErrorMetadata {
    if (!(error instanceof QueryFailedError)) {
      return {
        code: null,
        constraint: null,
        isQueryFailed: false,
      };
    }

    const driverError = this.getDriverError(error as QueryFailedError<Error>);

    return {
      code: driverError?.code ?? null,
      constraint: driverError?.constraint?.toLowerCase() ?? null,
      isQueryFailed: true,
    };
  }

  isUniqueViolation(error: unknown): boolean {
    return (
      this.getMetadata(error).code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION
    );
  }

  throwQueryFailed(): never {
    throw new InternalServerErrorException({
      statusCode: APP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: DATABASE_MESSAGES.QUERY_FAILED,
    });
  }

  throwOperationFailed(): never {
    throw new InternalServerErrorException({
      statusCode: APP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: DATABASE_MESSAGES.OPERATION_FAILED,
    });
  }

  private getDriverError(
    error: QueryFailedError<Error>,
  ): PostgresDriverError | null {
    const typedError = error as QueryFailedError<Error> & {
      driverError?: PostgresDriverError;
    };

    return typedError.driverError ?? null;
  }
}
