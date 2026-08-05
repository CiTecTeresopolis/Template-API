import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ============================================================
// PrismaService — encapsula o cliente do Prisma.
//
// Estende PrismaClient (por isso expõe prisma.usuario, prisma.empresa,
// prisma.auditoria etc.) e implementa OnModuleInit para abrir a conexão
// com o banco assim que o módulo é inicializado.
// ============================================================
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Estabelece a conexão com o banco no boot da aplicação.
    await this.$connect();
  }
}
