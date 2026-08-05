import { JwtService } from '@nestjs/jwt';
import { Global, Module } from '@nestjs/common';
import { AuditService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';
import { PrismaModule } from '../prisma/prisma.module';

// ============================================================
// AuditoriaModule — módulo global de auditoria.
//
// @Global() + exports [AuditService] permite que QUALQUER service
// injete o AuditService e chame `auditService.log(...)` sem importar
// este módulo. É por isso que AuthService, UsuarioService e
// PerfilAcessoService registram auditoria facilmente.
// ============================================================
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuditoriaController],
  providers: [AuditService, JwtService],
  exports: [AuditService],
})
export class AuditoriaModule {}
