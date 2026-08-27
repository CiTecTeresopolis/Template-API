import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuditService } from './auditoria.service';
import { FilterAuditoriaDto } from './dto/filter-auditoria.dto';

// ============================================================
// AuditoriaController — consulta de registros de auditoria.
//
// Proteção em nível de MÉTODO (só o GET), exigindo a permissão
// ACESSAR_AUDITORIA.
// ============================================================
@ApiTags('auditoria')
@ApiBearerAuth('access-token')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditService: AuditService) {}

  // GET /auditoria?usuarioNome=&entidade=&acao=&dataInicio=&dataFim=&page=&limit=
  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('ACESSAR_AUDITORIA')
  async listar(@Query() filtros: FilterAuditoriaDto) {
    // Converte as datas ISO (string) em Date antes de passar ao service.
    return this.auditService.listar({
      usuarioNome: filtros.usuarioNome,
      entidade: filtros.entidade,
      acao: filtros.acao,
      dataInicio: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
      dataFim: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
      page: filtros.page,
      limit: filtros.limit,
    });
  }
}
