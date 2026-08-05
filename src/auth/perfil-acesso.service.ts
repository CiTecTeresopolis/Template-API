import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../auditoria/auditoria.service';
import { CreatePerfilAcessoDto } from './dto/create-perfil-acesso.dto';
import { UpdatePerfilAcessoDto } from './dto/update-perfil-acesso.dto';

// ============================================================
// PerfilAcessoService — lógica de negócio dos perfis de acesso.
//
// Regras importantes implementadas aqui:
//   - "descricao" é única (duplicada -> 409 Conflict);
//   - o perfil "Administrador" NÃO pode ser editado/excluído;
//   - um perfil com usuários vinculados NÃO pode ser excluído;
//   - todas as mutações geram registro de auditoria.
// ============================================================
@Injectable()
export class PerfilAcessoService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Lista perfis com paginação, contagem de usuários e permissões.
  async listar(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    // Promise.all executa a consulta de dados e a contagem total em paralelo.
    const [perfis, total] = await Promise.all([
      this.prisma.perfilAcesso.findMany({
        orderBy: { descricao: 'asc' },
        skip,
        take: limit,
        include: {
          // _count traz a quantidade de usuários vinculados sem carregar todos.
          _count: { select: { usuarios: true } },
          permissoes: {
            include: {
              permissao: {
                select: { chave: true, descricao: true, modulo: true },
              },
            },
          },
        },
      }),
      this.prisma.perfilAcesso.count(),
    ]);

    // Normaliza a resposta: lista de chaves de permissão + metadata de página.
    return {
      data: perfis.map((p) => ({
        id: p.id,
        descricao: p.descricao,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        totalUsuarios: p._count.usuarios,
        permissoes: p.permissoes.map((pp) => pp.permissao.chave),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Busca um perfil pelo ID, incluindo as permissões completas.
  async buscarPorId(id: number) {
    const perfil = await this.prisma.perfilAcesso.findUnique({
      where: { id },
      include: {
        permissoes: {
          include: { permissao: true },
        },
        _count: { select: { usuarios: true } },
      },
    });

    if (!perfil) throw new NotFoundException('Perfil de acesso não encontrado');

    return {
      ...perfil,
      totalUsuarios: perfil._count.usuarios,
      permissoes: perfil.permissoes.map((pp) => pp.permissao.chave),
    };
  }

  // Cria um perfil, vinculando as permissões recebidas por chave.
  async criar(dto: CreatePerfilAcessoDto, usuarioId: number) {
    // Garante que não haja descrição duplicada.
    const existente = await this.prisma.perfilAcesso.findUnique({
      where: { descricao: dto.descricao },
    });
    if (existente)
      throw new ConflictException('Já existe um perfil com essa descrição');

    // Busca as permissões pelas chaves informadas.
    const permissoes = await this.prisma.permissao.findMany({
      where: { chave: { in: dto.permissoes } },
    });

    // Se alguma chave não existir, devolve quais estão faltando.
    if (permissoes.length !== dto.permissoes.length) {
      const encontradas = permissoes.map((p) => p.chave);
      const faltando = dto.permissoes.filter((c) => !encontradas.includes(c));
      throw new BadRequestException(
        `Permissões não encontradas: ${faltando.join(', ')}`,
      );
    }

    // Cria o perfil e os vínculos permissão-perfil (create aninhado).
    const perfil = await this.prisma.perfilAcesso.create({
      data: {
        descricao: dto.descricao,
        status: dto.status ?? true,
        permissoes: {
          create: permissoes.map((p) => ({ permissaoId: p.id })),
        },
      },
    });

    this.auditService.log({
      usuarioId,
      acao: 'CRIAR',
      entidade: 'PerfilAcesso',
      entidadeId: perfil.id,
      valoresNov: JSON.stringify({
        descricao: perfil.descricao,
        permissoes: dto.permissoes,
      }),
    });

    return perfil;
  }

  // Atualiza descrição/status e/ou substitui a lista de permissões.
  async atualizar(id: number, dto: UpdatePerfilAcessoDto, usuarioId: number) {
    const perfil = await this.prisma.perfilAcesso.findUnique({ where: { id } });
    if (!perfil) throw new NotFoundException('Perfil de acesso não encontrado');

    // Perfil de sistema: não pode ser editado.
    if (perfil.descricao === 'Administrador') {
      throw new BadRequestException(
        'O perfil Administrador não pode ser editado',
      );
    }

    // Checa duplicidade caso a descrição esteja sendo alterada.
    if (dto.descricao && dto.descricao !== perfil.descricao) {
      const existente = await this.prisma.perfilAcesso.findUnique({
        where: { descricao: dto.descricao },
      });
      if (existente)
        throw new ConflictException('Já existe um perfil com essa descrição');
    }

    // Se veio a lista de permissões, valida as chaves e substitui os vínculos
    // (apaga todos os antigos e recria com os novos).
    if (dto.permissoes) {
      const permissoes = await this.prisma.permissao.findMany({
        where: { chave: { in: dto.permissoes } },
      });

      const chavesExistentes = permissoes.map((p) => p.chave);
      const faltando = dto.permissoes.filter(
        (c) => !chavesExistentes.includes(c),
      );
      if (faltando.length > 0) {
        throw new BadRequestException(
          `Permissões não encontradas: ${faltando.join(', ')}`,
        );
      }

      await this.prisma.permissaoPerfil.deleteMany({ where: { perfilId: id } });
      await this.prisma.permissaoPerfil.createMany({
        data: permissoes.map((p) => ({ perfilId: id, permissaoId: p.id })),
      });
    }

    // Atualiza os campos simples (descricao e/ou status), se informados.
    if (dto.descricao || dto.status !== undefined) {
      await this.prisma.perfilAcesso.update({
        where: { id },
        data: {
          ...(dto.descricao && { descricao: dto.descricao }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
      });
    }

    // Retorna o estado final já com permissões e contagem de usuários.
    const perfilAtualizado = await this.buscarPorId(id);

    this.auditService.log({
      usuarioId,
      acao: 'ATUALIZAR',
      entidade: 'PerfilAcesso',
      entidadeId: id,
      valoresAnt: JSON.stringify({ descricao: perfil.descricao }),
      valoresNov: JSON.stringify({
        descricao: dto.descricao || perfil.descricao,
      }),
    });

    return perfilAtualizado;
  }

  // Exclui um perfil, desde que não seja o Administrador nem tenha usuários.
  async excluir(id: number, usuarioId: number) {
    const perfil = await this.prisma.perfilAcesso.findUnique({
      where: { id },
      include: { _count: { select: { usuarios: true } } },
    });

    if (!perfil) throw new NotFoundException('Perfil de acesso não encontrado');

    if (perfil.descricao === 'Administrador') {
      throw new BadRequestException(
        'O perfil Administrador não pode ser excluído',
      );
    }

    if (perfil._count.usuarios > 0) {
      throw new BadRequestException(
        `Este perfil possui ${perfil._count.usuarios} usuário(s) vinculado(s). Remova os vínculos antes de excluir.`,
      );
    }

    await this.prisma.perfilAcesso.delete({ where: { id } });

    this.auditService.log({
      usuarioId,
      acao: 'EXCLUIR',
      entidade: 'PerfilAcesso',
      entidadeId: id,
      valoresAnt: JSON.stringify({ descricao: perfil.descricao }),
    });

    return { message: 'Perfil excluído com sucesso' };
  }
}
