import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { Usuario, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password/password.service';
import { PasswordUpdateDto } from './dto/password-update-dto';
import { AuditService } from '../auditoria/auditoria.service';
import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';

// Define a estrutura do objeto de filtro dinamicamente
interface whereClause {
  [key: string]: string | boolean | { contains: string };
}

// ============================================================
// UsuarioService — lógica de negócio de usuários.
// ============================================================
@Injectable()
export class UsuarioService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private auditService: AuditService,
  ) {}

  // Cria um Usuário e retorna o mesmo
  async createUser(
    data: CreateUserDto,
    empresaId: number,
    usuarioId: number,
  ): Promise<Usuario | { error: string }> {
    const hashedPassword = await this.passwordService.hashPassword(data.senha);
    const createData: any = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      comissao: data.comissao,
      senha: hashedPassword,
      empresa: { connect: { id: empresaId } },
      usuarioAlteracao: { connect: { id: usuarioId } },
    };

    if (data.perfilAcessoId) {
      createData.perfilAcesso = { connect: { id: data.perfilAcessoId } };
    }

    const usuario: Usuario = await this.prisma.usuario.create({
      data: createData,
    });

    const token = this.gerarToken(usuario);
    usuario.token = token.access_token;
    delete (usuario as Partial<Usuario>).senha;

    this.auditService.log({
      usuarioId,
      acao: 'CRIAR',
      entidade: 'Usuario',
      entidadeId: usuario.id,
      valoresNov: JSON.stringify({ nome: data.nome, email: data.email }),
    });

    return usuario;
  }

  // Retorna todos os Usuários
  async getUsers(): Promise<Usuario[]> {
    return this.prisma.usuario.findMany({
      orderBy: { nome: 'asc' },
      include: {
        perfilAcesso: { select: { id: true, descricao: true } },
      },
    });
  }

  // Retorna um Usuário por ID
  async getUserById(id: number): Promise<Usuario> {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: {
        perfilAcesso: {
          select: { id: true, descricao: true },
        },
      },
    }) as any;
  }

  // Retorna um Usuário por Email
  async getUserByEmail(email: string): Promise<Usuario> {
    return this.prisma.usuario.findFirst({
      where: { email, ativo: true },
      include: {
        perfilAcesso: {
          include: {
            permissoes: {
              include: { permissao: { select: { chave: true } } },
            },
          },
        },
      },
    }) as any;
  }

  // Retorna uma lista de Usuários por filtro
  async getfilterUsers(
    filtros: {
      nome?: string;
      email?: string;
      telefone?: string;
      ativo?: boolean;
    },
    page = 1,
    limit = 50,
  ): Promise<{
    data: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const where: whereClause = {};
    const skip = (page - 1) * limit;

    if (filtros.nome) {
      where.nome = { contains: filtros.nome };
    }
    if (filtros.email) where.email = filtros.email;
    if (filtros.telefone) where.telefone = filtros.telefone;
    if (filtros.ativo !== undefined) where.ativo = filtros.ativo;

    const select = {
      id: true,
      nome: true,
      telefone: true,
      email: true,
      ativo: true,
      createdAt: true,
      updatedAt: true,
      comissao: true,
      perfilAcessoId: true,
      perfilAcesso: { select: { id: true, descricao: true } },
    };

    const [data, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Atualiza um Usuário
  async updateUser(
    id: number,
    data: Prisma.UsuarioUpdateInput & { 
      perfilAcessoId?: number | null; 
      senha?: string;
      senhaAtual?: string;
    },
    usuarioId: number,
  ): Promise<Usuario> {
    const updateData: any = {
      ...data,
      usuarioAlteracao: { connect: { id: usuarioId } },
    };

    const usuarioAntigo = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioAntigo) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // 1. Se alterou e-mail ou enviou nova senha, exige e valida a senhaAtual
    const alterouEmail = data.email && data.email !== usuarioAntigo.email;
    const alterouSenha = data.senha && typeof data.senha === 'string' && data.senha.trim() !== '';

    if (alterouEmail || alterouSenha) {
      if (!data.senhaAtual) {
        throw new BadRequestException('Informe a senha atual para confirmar as alterações.');
      }

      const senhaValida = await this.passwordService.comparePassword(
        data.senhaAtual,
        usuarioAntigo.senha,
      );

      if (!senhaValida) {
        throw new UnauthorizedException('A senha atual informada está incorreta.');
      }
    }

    // Limpa o campo auxiliar 'senhaAtual' para não quebrar a query do Prisma
    delete updateData.senhaAtual;

    // 2. Criptografa a nova senha (se fornecida) ou remove o campo do payload
    if (alterouSenha) {
      updateData.senha = await this.passwordService.hashPassword(data.senha as string);
    } else {
      delete updateData.senha;
    }

    // 3. Tratamento do Perfil de Acesso
    if (data.perfilAcessoId !== undefined) {
      if (data.perfilAcessoId === null || data.perfilAcessoId === 0) {
        updateData.perfilAcesso = { disconnect: true };
      } else {
        updateData.perfilAcesso = { connect: { id: data.perfilAcessoId } };
      }
    }
    delete updateData.perfilAcessoId;

    const updated = await this.prisma.usuario.update({
      data: updateData,
      where: { id },
    });

    const foiReativado = !usuarioAntigo.ativo && updated.ativo;

    this.auditService.log({
      usuarioId,
      acao: foiReativado ? 'HABILITAR' : 'ATUALIZAR',
      entidade: 'Usuario',
      entidadeId: id,
      valoresAnt: JSON.stringify({
        nome: usuarioAntigo.nome,
        email: usuarioAntigo.email,
      }),
      valoresNov: JSON.stringify({
        nome: updated.nome,
        email: updated.email,
      }),
    });

    return updated;
  }

  // Desabilita um Usuário
  async disableUser(id: number, usuarioId: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.update({
      data: {
        ativo: false,
        usuarioAlteracao: { connect: { id: usuarioId } },
      },
      where: { id },
    });

    this.auditService.log({
      usuarioId,
      acao: 'DESABILITAR',
      entidade: 'Usuario',
      entidadeId: id,
      valoresNov: JSON.stringify({ nome: usuario.nome, email: usuario.email }),
    });

    return usuario;
  }

  // Habilita um Usuário
  async enableUser(id: number, usuarioId: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.update({
      data: {
        ativo: true,
        usuarioAlteracao: { connect: { id: usuarioId } },
      },
      where: { id },
    });

    this.auditService.log({
      usuarioId,
      acao: 'HABILITAR',
      entidade: 'Usuario',
      entidadeId: id,
      valoresNov: JSON.stringify({ nome: usuario.nome, email: usuario.email }),
    });

    return usuario;
  }

  // Atualiza a senha de um Usuário
  async updatePassword(id: number, data: PasswordUpdateDto): Promise<boolean> {
    try {
      const usuario = await this.getUserById(id);
      const compare = await this.passwordService.comparePassword(
        data.senhaAtual,
        usuario.senha,
      );

      if (compare) {
        const hashedPassword = await this.passwordService.hashPassword(
          data.novaSenha,
        );
        await this.prisma.usuario.update({
          data: {
            senha: hashedPassword,
            usuarioAlteracao: { connect: { id: id } },
          },
          where: { id },
        });
        return true;
      }

      throw new UnauthorizedException('Senha Inválida!');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return false;
    }
  }

  // Reset de senha administrativo
  async updatePasswordWithoutPassword(
    id: number,
    data: PasswordUpdateDto,
  ): Promise<boolean> {
    try {
      const hashedPassword = await this.passwordService.hashPassword(
        data.novaSenha,
      );
      await this.prisma.usuario.update({
        data: { senha: hashedPassword },
        where: { id },
      });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return false;
    }
  }

  // Gera token JWT
  gerarToken(payload: { email: string }) {
    return {
      access_token: this.jwtService.sign(
        { email: payload.email },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: (process.env.JWT_EXPIRES_IN ||
            '8h') as JwtSignOptions['expiresIn'],
        },
      ),
    };
  }

  // Concluir Onboarding
  async concluirOnboarding(id: number): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { id },
      data: { onboardingCompleto: true },
    });
  }
}