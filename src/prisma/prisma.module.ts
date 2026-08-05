import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// ============================================================
// PrismaModule — fornece o PrismaService para toda a aplicação.
//
// @Global() torna os providers deste módulo disponíveis em qualquer
// outro módulo SEM precisar importá-lo explicitamente. É por isso que
// services como AuditService e PerfilAcessoService usam PrismaService
// direto no construtor, mesmo sem importar o PrismaModule.
// ============================================================
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
