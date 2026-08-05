import { Response } from 'express';
import { Request } from 'express';
import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppLoggerService } from '../../logger/logger.service';

// ============================================================
// AllExceptionsFilter — filtro GLOBAL de exceções.
//
// Registrado em main.ts, intercepta TODAS as exceções não tratadas e:
//   1. define o status HTTP correto (ou 500 se não for HttpException);
//   2. extrai mensagens de validação (class-validator) para resposta legível;
//   3. registra o erro no Winston com contexto (método, rota, status, IP);
//   4. retorna um JSON padronizado: { statusCode, message, timestamp, path }.
//
// Em desenvolvimento o campo `stack` é incluído na resposta para facilitar
// o debug; em produção ele é omitido.
// ============================================================
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // HttpException já carrega um status; o restante vira 500.
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Resposta original da exceção (pode conter a lista de erros de validação).
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    // Se for erro de validação, usamos a lista de mensagens (array).
    const validationErrors = this.extractValidationErrors(exceptionResponse);

    const message = validationErrors
      ? validationErrors
      : exception instanceof HttpException
        ? exception.message
        : 'Erro interno do servidor';

    const userAgent = request.headers['user-agent'] || '';
    const ip = request.ip || request.socket?.remoteAddress || '';

    const logMessage = Array.isArray(message)
      ? `${request.method} ${request.url} - ${status} - Validation errors: ${message.join('; ')}`
      : `${request.method} ${request.url} - ${status} - ${message}`;

    // Registra o erro no logger (Winston).
    this.logger.error(
      logMessage,
      exception instanceof Error ? exception.stack : undefined,
      'ExceptionFilter',
      { ip, userAgent, path: request.url, method: request.method, status },
    );

    // Corpo padronizado de resposta de erro.
    const responseBody: any = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Expõe o stack trace apenas fora de produção.
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      responseBody.stack = exception.stack;
    }

    response.status(status).json(responseBody);
  }

  // Extrai a lista de mensagens quando a exceção veio do ValidationPipe
  // (o response do BadRequestException tem `message` como string[]).
  private extractValidationErrors(
    exceptionResponse: string | object | null,
  ): string[] | null {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const msg = (exceptionResponse as any).message;
      if (Array.isArray(msg) && msg.length > 0) {
        return msg;
      }
    }
    return null;
  }
}
