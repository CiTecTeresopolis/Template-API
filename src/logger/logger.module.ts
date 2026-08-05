import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './logger.service';

// ============================================================
// LoggerModule — módulo global de logging.
//
// Assim como PrismaModule, é @Global() e exporta o AppLoggerService
// para que qualquer service/controller possa injetá-lo no construtor
// sem importar o módulo (ver uso no AllExceptionsFilter).
// ============================================================
@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
