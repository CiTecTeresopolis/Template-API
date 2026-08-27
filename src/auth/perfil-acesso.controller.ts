import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PerfilAcessoService } from './perfil-acesso.service';
import { CreatePerfilAcessoDto } from './dto/create-perfil-acesso.dto';
import { UpdatePerfilAcessoDto } from './dto/update-perfil-acesso.dto';

// ============================================================
// PerfilAcessoController — CRUD de perfis de acesso (RBAC).
//
// Protegido em nível de CLASSE:
//   @UseGuards(AuthGuard, PermissionsGuard)  -> exige token válido;
//   @Permissions('GERENCIAR_PERFIS_ACESSO')  -> exige a permissão.
// Com isso, TODAS as rotas abaixo herdam essa proteção.
//
// Obs.: o header `x-usuario-id` indica quem está executando a ação;
// é usado para preencher a auditoria.
// ============================================================
@ApiTags('perfis-acesso')
@ApiBearerAuth('access-token')
@Controller('perfil-acesso')
@UseGuards(AuthGuard, PermissionsGuard)
@Permissions('GERENCIAR_PERFIL_ACESSO')
export class PerfilAcessoController {
  constructor(private readonly service: PerfilAcessoService) {}

  // GET /perfis-acesso?page=1&limit=50
  @Get()
  @ApiOperation({ summary: 'Listar todos os perfis de acesso' })
  listar(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listar(Number(page) || 1, Number(limit) || 50);
  }

  // GET /perfis-acesso/:id
  @Get(':id')
  @ApiOperation({ summary: 'Buscar perfil de acesso por ID' })
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarPorId(id);
  }

  // POST /perfis-acesso
  @Post()
  @ApiOperation({ summary: 'Criar perfil de acesso' })
  criar(
    @Body() dto: CreatePerfilAcessoDto,
    @Headers('x-usuario-id') usuarioId: string,
  ) {
    return this.service.criar(dto, Number(usuarioId));
  }

  // PUT /perfis-acesso/:id
  @Put(':id')
  @ApiOperation({ summary: 'Atualizar perfil de acesso' })
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePerfilAcessoDto,
    @Headers('x-usuario-id') usuarioId: string,
  ) {
    return this.service.atualizar(id, dto, Number(usuarioId));
  }

  // DELETE /perfis-acesso/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Excluir perfil de acesso' })
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-usuario-id') usuarioId: string,
  ) {
    return this.service.excluir(id, Number(usuarioId));
  }
}
