import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';
import { FILE_MESSAGES } from '../../constants/app.constants';

@Catch(MulterError, PayloadTooLargeException, BadRequestException)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(
    exception: MulterError | PayloadTooLargeException | BadRequestException,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();

    const isMulterSizeError =
      exception instanceof MulterError && exception.code === 'LIMIT_FILE_SIZE';

    const isPayloadTooLarge = exception instanceof PayloadTooLargeException;

    const responseBody =
      exception instanceof PayloadTooLargeException ||
      exception instanceof BadRequestException
        ? exception.getResponse()
        : null;

    const messageValue =
      typeof responseBody === 'string'
        ? responseBody
        : (responseBody as { message?: unknown } | null)?.message;

    const firstArrayMessage =
      Array.isArray(messageValue) && messageValue.length > 0
        ? messageValue[0]
        : undefined;

    const responseMessage =
      typeof firstArrayMessage === 'string'
        ? firstArrayMessage
        : typeof messageValue === 'string'
          ? messageValue
          : undefined;

    const isPlainFileTooLargeMessage = responseMessage === 'File too large';

    if (isMulterSizeError || isPayloadTooLarge || isPlainFileTooLargeMessage) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        success: false,
        message: FILE_MESSAGES.SIZE_EXCEEDED,
        data: null,
        error: 'Payload Too Large',
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: responseMessage ?? exception.message,
      data: null,
      error: 'Bad Request',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
