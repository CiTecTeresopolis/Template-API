import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ============================================================
// PermissaoService — consultas de permissões do sistema.
//
// As permissões são cadastradas via seed (prisma/seed.ts) e servem como
// "chaves" que o PermissionsGuard compara com o perfil do usuário.
// ============================================================
@Injectable()
export class PermissaoService {
  constructor(private prisma: PrismaService) {}

  // Lista todas as permissões ordenadas por módulo e descrição,
  // facilitando agrupar as permissões na interface do cliente.
  async listar() {
    return this.prisma.permissao.findMany({
      orderBy: [{ modulo: 'asc' }, { descricao: 'asc' }],
    });
  }
}
