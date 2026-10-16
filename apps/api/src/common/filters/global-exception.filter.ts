import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!(exception instanceof HttpException)) {
      const name = exception instanceof Error ? exception.name : 'UnknownError';
      this.logger.error(
        `Unhandled server error: ${name}`,
        process.env.NODE_ENV === 'production'
          ? undefined
          : exception instanceof Error
            ? exception.stack
            : undefined,
      );
    }
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const details =
      typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
    const fallbackMessage =
      typeof payload === 'string' ? payload : 'Request could not be processed';
    const body: ErrorBody = {
      statusCode: status,
      message:
        status === 500
          ? 'Internal server error'
          : ((details.message as string | string[] | undefined) ?? fallbackMessage),
      error: (details.error as string | undefined) ?? HttpStatus[status] ?? 'Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(status).json(body);
  }
}
