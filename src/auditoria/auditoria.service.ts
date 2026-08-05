import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Parâmetros para registrar uma ação de auditoria.
export interface AuditLogParams {
  usuarioId?: number; // quem executou a ação (null para ações de sistema)
  acao: string; // ex.: LOGIN, CRIAR, ATUALIZAR, EXCLUIR, DESABILITAR
  entidade: string; // nome da entidade afetada (ex.: Usuario, PerfilAcesso)
  entidadeId?: number; // id do registro afetado
  valoresAnt?: string; // JSON com o estado anterior (para diffs)
  valoresNov?: string; // JSON com o novo estado
  ip?: string;
  userAgent?: string;
}

// Filtros da consulta de auditoria (GET /auditoria).
export interface AuditFilterParams {
  usuarioNome?: string;
  entidade?: string;
  acao?: string;
  dataInicio?: Date;
  dataFim?: Date;
  page?: number;
  limit?: number;
}

// ============================================================
// AuditService — registro e consulta de auditoria.
//
// Rastrea quem fez o quê, quando e de onde. As mutações dos services
// (usuário, perfis, login) chamam `log(...)` para gravar um registro.
// ============================================================
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // Registra uma ação do sistema na tabela de auditoria.
  async log(params: AuditLogParams) {
    return this.prisma.auditoria.create({
      data: {
        usuarioId: params.usuarioId ?? null,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId ?? null,
        valoresAnt: params.valoresAnt ?? null,
        valoresNov: params.valoresNov ?? null,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  // Consulta de auditoria com filtros e paginação.
  async listar(filtros?: AuditFilterParams) {
    // Paginação simples para evitar retorno massivo de registros.
    const page = filtros?.page || 1;
    const limit = filtros?.limit || 50;
    const skip = (page - 1) * limit;

    // Monta o filtro dinamicamente conforme os parâmetros recebidos.
    const where: Record<string, unknown> = {};

    // Busca parcial pelo nome do usuário (relação com a tabela Usuario).
    if (filtros?.usuarioNome) {
      where.usuario = { nome: { contains: filtros.usuarioNome } };
    }
    if (filtros?.entidade) where.entidade = filtros.entidade;
    if (filtros?.acao) where.acao = filtros.acao;
    // Intervalo de datas sobre o campo createdAt (quando a ação ocorreu).
    if (filtros?.dataInicio || filtros?.dataFim) {
      where.createdAt = {};
      if (filtros.dataInicio) (where.createdAt as any).gte = filtros.dataInicio;
      if (filtros.dataFim) (where.createdAt as any).lte = filtros.dataFim;
    }

    // Consulta + contagem em paralelo (mesmo padrão dos outros services).
    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: {
          usuario: {
            select: { id: true, nome: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' }, // mais recentes primeiro
        skip,
        take: limit,
      }),
      this.prisma.auditoria.count({ where }),
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
}
