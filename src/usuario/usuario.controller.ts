import { Response } from 'express';
import {
  Res,
  Get,
  Put,
  Post,
  Body,
  Headers,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Controller,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UsuarioService } from './usuario.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { PasswordUpdateDto } from './dto/password-update-dto';
import { Usuario as UsuarioModel } from '@prisma/client';

// Tipagem local para capturar erros específicos do Prisma.
interface PrismaError {
  code: string;
  meta?: {
    target?: string | string[];
  };
}

// Usuário sem o campo `senha` e com o token de acesso (retorno do create).
type UsuarioComToken = Omit<UsuarioModel, 'senha'> & { token: string };

// ============================================================
// UsuarioController — CRUD e gestão de usuários.
//
// Proteção em nível de CLASSE (igual ao PerfilAcessoController):
//   @UseGuards(AuthGuard, PermissionsGuard)
//   @Permissions('GERENCIAR_USUARIOS')
//
// Exceções pontuais:
//   - "senha/:id"      -> @Permissions() sem chaves (qualquer usuário
//                          autenticado pode trocar a própria senha);
//   - "onboarding/:id" -> @Permissions() idem.
//
// Headers utilizados:
//   - x-empresa-id -> empresa a qual o usuário pertence;
//   - x-usuario-id -> usuário logado que executa a ação (auditoria).
// ============================================================
@ApiTags('usuario')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, PermissionsGuard)
@Permissions('GERENCIAR_USUARIOS')
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  // POST /usuario
  // Cria um usuário. Usa @Res() para controlar manualmente o status
  // 201 e tratar o erro de e-mail duplicado (P2002) com 409.
  @Post()
  @ApiOperation({ summary: 'Cadastrar Usuário' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso!' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Headers('x-empresa-id') empresaId: string,
    @Headers('x-usuario-id') usuarioId: string,
    @Res() res: Response,
  ): Promise<UsuarioComToken | Response> {
    try {
      const usuario = await this.usuarioService.createUser(
        createUserDto,
        Number(empresaId),
        Number(usuarioId),
      );
      return res.status(201).send(usuario);
    } catch (e: any) {
      const error = e as PrismaError;
      // Código P2002 = violação de constraint única (e-mail duplicado).
      if (error.code === 'P2002') {
        return res.status(HttpStatus.CONFLICT).send({
          message: 'Já existe um usuário cadastrado com este e-mail.',
        });
      }
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send({ message: `Erro ao cadastrar usuário` });
    }
  }

  // GET /usuario — lista todos os usuários (sem paginação).
  @Get()
  @ApiOperation({ summary: 'Listar todos os Usuários' })
  @ApiResponse({ status: 200, description: 'Retorna todos os usuários.' })
  async getUsers(): Promise<UsuarioModel[]> {
    return await this.usuarioService.getUsers();
  }

  // GET /usuario/filtrados — lista usuários com filtros + paginação.
  // Obs.: precisa estar ANTES de GET /usuario/:id para não colidir
  // com o parâmetro de rota "filtrados".
  @Get('filtrados')
  @ApiOperation({
    summary: 'Listar todos os Usuários a partir dos filtros passados',
  })
  @ApiResponse({ status: 200, description: 'Retorna todos os usuários.' })
  async getFilterUsers(@Query() filtros: FilterUserDto): Promise<any> {
    // Separa os filtros de negócio dos parâmetros de paginação.
    const { page, limit, ...filterData } = filtros;
    return await this.usuarioService.getfilterUsers(
      filterData,
      page || 1,
      limit || 50,
    );
  }

  // GET /usuario/:id
  @Get(':id')
  @ApiOperation({ summary: 'Pegar Usuário por Id' })
  @ApiResponse({ status: 200, description: 'Retorna um usuário por id.' })
  async getUserById(@Param('id') id: number): Promise<UsuarioModel> {
    return await this.usuarioService.getUserById(id);
  }

  // PUT /usuario/:id — atualiza dados do usuário.
  @Put(':id')
  @ApiOperation({ summary: 'Atualiza Usuário por Id' })
  @ApiResponse({ status: 201, description: 'Usuário atualizado com sucesso!' })
  async updateUserById(
    @Param('id') id: number,
    @Headers('x-usuario-id') usuarioId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UsuarioModel> {
    return await this.usuarioService.updateUser(
      id,
      updateUserDto,
      Number(usuarioId),
    );
  }

  // PUT /usuario/desabilitar/:id — desativa usuário (deleção lógica).
  @Put('desabilitar/:id')
  @ApiOperation({ summary: 'Desabilita um Usuário por Id' })
  @ApiResponse({
    status: 201,
    description: 'Usuário desabilitado com sucesso!',
  })
  async disableUserById(
    @Headers('x-usuario-id') usuarioId: string,
    @Param('id') id: number,
  ): Promise<UsuarioModel> {
    return await this.usuarioService.disableUser(id, Number(usuarioId));
  }

  // PUT /usuario/habilitar/:id — reativa usuário.
  @Put('habilitar/:id')
  @ApiOperation({ summary: 'Habilita um Usuário por Id' })
  @ApiResponse({
    status: 201,
    description: 'Usuário habilitado com sucesso!',
  })
  async enableUserById(
    @Headers('x-usuario-id') usuarioId: string,
    @Param('id') id: number,
  ): Promise<UsuarioModel> {
    return await this.usuarioService.enableUser(id, Number(usuarioId));
  }

  // PUT /usuario/senha/:id — troca de senha EXIGINDO a senha atual.
  // @Permissions() (sem chaves) libera para qualquer usuário autenticado.
  @Put('senha/:id')
  @Permissions()
  @ApiOperation({ summary: 'Atualiza a senha de um Usuário' })
  @ApiResponse({ status: 201, description: 'Senha atualizada com sucesso!' })
  async updatePassword(
    @Headers('x-usuario-id') usuarioId: string,
    @Param('id') id: number,
    @Body() data: PasswordUpdateDto,
  ): Promise<boolean> {
    return await this.usuarioService.updatePassword(id, data);
  }

  // PUT /usuario/senha/sem-senha/:id — troca de senha SEM exigir a atual.
  // Endpoint para reset administrativo de senha (pode exigir revisão de
  // segurança em produção).
  @Put('senha/sem-senha/:id')
  @ApiOperation({ summary: 'Atualiza a senha de um Usuário' })
  @ApiResponse({ status: 201, description: 'Senha atualizada com sucesso!' })
  async updatePasswordWithoutPassword(
    @Param('id') id: number,
    @Body() data: PasswordUpdateDto,
  ): Promise<boolean> {
    return await this.usuarioService.updatePasswordWithoutPassword(id, data);
  }

  // PUT /usuario/onboarding/:id — marca o onboarding do usuário como concluído.
  @Put('onboarding/:id')
  @Permissions()
  @ApiOperation({ summary: 'Marca o onboarding do usuário como concluído' })
  @ApiResponse({ status: 201, description: 'Onboarding concluído!' })
  async concluirOnboarding(@Param('id') id: number): Promise<UsuarioModel> {
    return await this.usuarioService.concluirOnboarding(id);
  }

  // PUT /usuario/perfil/me — atualiza os dados do próprio perfil (profile != role) autenticado
  @Put('perfil/me')
  @Permissions()
  @ApiOperation({ summary: 'Atualiza o próprio perfil do usuário logado' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso!' })
  async updateOwnProfile(
    @Headers('x-usuario-id') usuarioId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UsuarioModel> {
    return await this.usuarioService.updateUser(
      Number(usuarioId),
      updateUserDto,
      Number(usuarioId),
    );
  }
}
