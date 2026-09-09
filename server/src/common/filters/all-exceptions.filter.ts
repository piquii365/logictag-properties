import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Logs the full error server-side but only ever returns a sanitized
 * {statusCode, message} to HTTP clients, so unexpected errors can't leak
 * stack traces or internal details.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} -> ${status}: ${
        exception instanceof Error ? exception.stack : String(exception)
      }`,
    );

    response
      .status(status)
      .json(
        typeof message === 'string'
          ? { statusCode: status, message }
          : { statusCode: status, ...message },
      );
  }
}
