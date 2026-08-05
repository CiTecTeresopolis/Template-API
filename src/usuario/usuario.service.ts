import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { Usuario, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password/password.service';
import { PasswordUpdateDto } from './dto/password-update-dto';
import { AuditService } from '../auditoria/auditoria.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';

// Define a estrutura do objeto de filtro dinamicamente
interface whereClause {
  [key: string]: string | boolean | { contains: string };
}

// ============================================================
// UsuarioService — lógica de negócio de usuários.
//
// Responsável por CRUD, filtros/paginação, ativação/desativação,
// troca de senha, onboarding e geração de token no cadastro.
// Praticamente toda mutação gera um registro de auditoria.
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
    // A senha NUNCA é salva em texto puro: apenas o hash bcrypt.
    const hashedPassword = await this.passwordService.hashPassword(data.senha);
    // Monta o objeto de criação. `createData` é `any` porque o Prisma
    // aceita os relacionamentos aninhados (connect).
    const createData: any = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      comissao: data.comissao,
      senha: hashedPassword,
      empresa: { connect: { id: empresaId } },
      // Registra quem criou o usuário (relação de auditoria).
      usuarioAlteracao: { connect: { id: usuarioId } },
    };
    // Vincula o perfil de acesso apenas se foi informado.
    if (data.perfilAcessoId) {
      createData.perfilAcesso = { connect: { id: data.perfilAcessoId } };
    }
    const usuario: Usuario = await this.prisma.usuario.create({
      data: createData,
    });
    // Gera um token já no cadastro (login automático pós-criação).
    const token = this.gerarToken(usuario);
    usuario.token = token.access_token;
    // Remove a senha do objeto antes de devolver ao cliente.
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

  // Retorna um Usuário por Email (inclui perfil + permissões para auth)
  // Usado no login. Só retorna usuários ATIVOS (ativo: true).
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

  // Retorna uma lista de Usuários por um filtro
  // Filtros: nome (busca parcial), email, telefone, ativo.
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
    // Monta o where dinamicamente a partir dos filtros recebidos.
    const where: whereClause = {};
    const skip = (page - 1) * limit;

    // Busca parcial (contains) apenas para o nome.
    if (filtros.nome) {
      where.nome = {
        contains: filtros.nome,
      };
    }

    // Demais filtros são busca exata.
    if (filtros.email) {
      where.email = filtros.email;
    }

    if (filtros.telefone) {
      where.telefone = filtros.telefone;
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    // Projeção explícita: evita retornar a coluna `senha` na listagem.
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

    // Consulta + contagem em paralelo para responder o metadata de paginação.
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
    data: Prisma.UsuarioUpdateInput & { perfilAcessoId?: number | null },
    usuarioId: number,
  ): Promise<Usuario> {
    const updateData: any = {
      ...data,
      // Registra quem executou a alteração.
      usuarioAlteracao: { connect: { id: usuarioId } },
    };
    // Trata o vínculo de perfil de acesso: null/0 desconecta o perfil.
    if (data.perfilAcessoId !== undefined) {
      if (data.perfilAcessoId === null || data.perfilAcessoId === 0) {
        updateData.perfilAcesso = { disconnect: true };
      } else {
        updateData.perfilAcesso = { connect: { id: data.perfilAcessoId } };
      }
    }
    // remove o campo "cru" do update (o Prisma espera o relacionamento).
    delete updateData.perfilAcessoId;
    const usuarioAntigo = await this.prisma.usuario.findUnique({
      where: { id },
    });
    const updated = await this.prisma.usuario.update({
      data: updateData,
      where: { id },
    });

    this.auditService.log({
      usuarioId,
      acao: 'ATUALIZAR',
      entidade: 'Usuario',
      entidadeId: id,
      valoresAnt: JSON.stringify({
        nome: usuarioAntigo?.nome,
        email: usuarioAntigo?.email,
      }),
      valoresNov: JSON.stringify({ nome: updated.nome, email: updated.email }),
    });

    return updated;
  }

  // Desabilita um Usuário (Deleção lógica)
  // O registro permanece no banco, mas `ativo: false` impede novos logins.
  async disableUser(id: number, usuarioId: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.update({
      data: {
        ativo: false,
        usuarioAlteracao: {
          connect: {
            id: usuarioId,
          },
        },
      },
      where: { id },
    });

    this.auditService.log({
      usuarioId,
      acao: 'DESABILITAR',
      entidade: 'Usuario',
      entidadeId: id,
    });

    return usuario;
  }

  // Habilita um Usuário
  async enableUser(id: number, usuarioId: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.update({
      data: {
        ativo: true,
        usuarioAlteracao: {
          connect: {
            id: usuarioId,
          },
        },
      },
      where: { id },
    });

    this.auditService.log({
      usuarioId,
      acao: 'HABILITAR',
      entidade: 'Usuario',
      entidadeId: id,
    });

    return usuario;
  }

  // Atualiza a senha de um Usuário
  // Exige a senha ATUAL para permitir a troca (segurança).
  async updatePassword(id: number, data: PasswordUpdateDto): Promise<boolean> {
    try {
      const usuario = await this.getUserById(id);
      // Confere se a senha atual informada bate com o hash salvo.
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
            usuarioAlteracao: {
              connect: {
                id: id,
              },
            },
          },
          where: { id },
        });
        return true;
      }

      throw new UnauthorizedException('Senha Inválida!');
    } catch (error) {
      // Re-throw para que o UnauthorizedException vire 401 de verdade.
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return false;
    }
  }

  // Atualiza a senha de um Usuário sem a senha atual
  // Uso administrativo/reset de senha.
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

  // Gera um token JWT simples (usado no cadastro de usuário).
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

  // Marca o onboarding do usuário como concluído.
  async concluirOnboarding(id: number): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { id },
      data: { onboardingCompleto: true },
    });
  }
}
