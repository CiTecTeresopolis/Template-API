import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissaoService } from './permissao.service';

// ============================================================
// PermissaoController — consulta de permissões disponíveis.
//
// Diferente do PerfilAcessoController, aqui os guards são aplicados em
// nível de MÉTODO (apenas no GET), servindo como exemplo de proteção
// mais granular. Também exige a permissão GERENCIAR_PERFIS_ACESSO.
// ============================================================
@ApiTags('permissoes')
@ApiBearerAuth('access-token')
@Controller('permissoes')
export class PermissaoController {
  constructor(private readonly permissaoService: PermissaoService) {}

  // GET /permissoes
  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('GERENCIAR_PERFIS_ACESSO')
  @ApiOperation({ summary: 'Listar todas as permissões disponíveis' })
  async listar() {
    return this.permissaoService.listar();
  }
}
