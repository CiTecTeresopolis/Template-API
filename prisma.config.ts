// ============================================================
// prisma.config.ts — configuração do Prisma (CLI e ferramentas).
//
// Define o caminho do schema, o datasource (via .env) e o comando de
// seed. Usado pelos scripts do package.json (prisma:seed, prisma:migrate).
// ============================================================
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // engine "classic" mantém compatibilidade com o fluxo tradicional
  // de geração de cliente (prisma-client-js).
  engine: 'classic',
  datasource: {
    // A URL do banco vem da variável de ambiente DATABASE_URL.
    url: env('DATABASE_URL'),
  },
  migrations: {
    // Comando executado pelo `prisma db seed`.
    seed: 'ts-node prisma/seed.ts',
  },
});