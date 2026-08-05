import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

// ============================================================
// PermissionsGuard — guard de autorização (RBAC).
//
// Deve ser executado DEPOIS do AuthGuard (que valida o JWT e grava
// request.user). Ele verifica se o usuário autenticado possui pelo menos
// UMA das permissões exigidas pelo decorator @Permissions do endpoint.
//
// Fluxo:
//   1. Lê as permissões exigidas via metadata (Reflector);
//   2. Sem permissões exigidas -> libera (rota autenticada sem restrição);
//   3. Busca o perfil do usuário no banco e monta a lista de chaves;
//   4. Libera se houver interseção entre exigidas e possuídas.
// ============================================================
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lê as permissões exigidas pelo decorator do endpoint.
    // getAllAndOverride mescla as definidas no controller (classe) e no
    // método, dando prioridade ao nível mais específico (handler).
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se o endpoint não exigir permissão explícita, ele fica livre.
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // `sub` é o id do usuário gravado no payload do JWT pelo AuthGuard.
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Busca o perfil do usuário para descobrir quais permissões ele possui.
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        perfilAcesso: {
          select: {
            permissoes: {
              select: {
                permissao: {
                  select: { chave: true },
                },
              },
            },
          },
        },
      },
    });

    // Cria uma lista simples com as chaves de permissão do perfil.
    const userPermissions =
      usuario?.perfilAcesso?.permissoes.map((pp) => pp.permissao.chave) ?? [];

    // O acesso é liberado se qualquer uma das permissões exigidas estiver
    // presente no conjunto do usuário.
    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Acesso negado: permissão insuficiente');
    }

    return true;
  }
}
