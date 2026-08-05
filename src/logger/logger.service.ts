import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

// ============================================================
// AppLoggerService — adaptador do Winston para o LoggerService do Nest.
//
// Comportamento:
//   - em desenvolvimento: logs coloridos e legíveis no console;
//   - em produção (NODE_ENV=production): logs em JSON no console e em
//     arquivos rotativos diários (error-*.log e combined-*.log) em LOG_DIR.
//
// O NestJS usa este serviço como logger global (registrado em main.ts
// via AppLoggerService + AllExceptionsFilter).
// ============================================================
@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Transportes (destinos) do log. Sempre há o console; em produção
    // são adicionados arquivos com rotação diária.
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: isProduction
          ? // Em produção: saída estruturada em JSON (fácil de ingerir
            // por ferramentas como ELK, Datadog, etc.).
            winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : // Em desenvolvimento: formato legível com cores e metadados.
            winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.printf(
                ({ timestamp, level, message, context, trace, ...meta }) => {
                  const ctx = context ? `[${context}]` : '';
                  const metaStr = Object.keys(meta).length
                    ? ` ${JSON.stringify(meta)}`
                    : '';
                  const traceStr = trace ? `\n${trace}` : '';
                  return `${timestamp} ${level} ${ctx} ${message}${metaStr}${traceStr}`;
                },
              ),
            ),
      }),
    ];

    if (isProduction) {
      // Arquivos de log com rotação diária. `maxFiles: '30d'` mantém os
      // últimos 30 dias antes de apagar os arquivos antigos.
      const logDir = process.env.LOG_DIR || 'logs';
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: `${logDir}/error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.DailyRotateFile({
          filename: `${logDir}/combined-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'info',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      transports,
    });
  }

  // Métodos abaixo implementam a interface LoggerService do NestJS.
  // `meta` é um objeto opcional com informações adicionais (ex.: ip, path).

  log(message: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.info(message, { context, ...meta });
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    meta?: Record<string, unknown>,
  ) {
    this.logger.error(message, { trace, context, ...meta });
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.verbose(message, { context, ...meta });
  }
}
