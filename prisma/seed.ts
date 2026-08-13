// ============================================================
// seed.ts — popula o banco com dados iniciais.
//
// Comando: `npx prisma db seed` (configurado no prisma.config.ts).
// Idempotente: pode ser executado quantas vezes quiser — todos os
// upserts apenas atualizam se o registro já existir.
//
// Cria:
//   - empresa padrão (id 1);
//   - as permissões base do sistema;
//   - o perfil "Administrador" com todas as permissões;
//   - o usuário admin (admin@template.local / Admin@12345).
// ============================================================
import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Chaves de permissão mínimas do template. Adicione novas permissões
// conforme novos módulos/endpoints forem criados.
const PERMISSOES = [
  {
    chave: 'GERENCIAR_USUARIOS',
    descricao: 'Gerenciar usuários',
    modulo: 'usuarios',
  },
  {
    chave: 'GERENCIAR_PERFIS_ACESSO',
    descricao: 'Gerenciar perfis de acesso',
    modulo: 'auth',
  },
  {
    chave: 'ACESSAR_AUDITORIA',
    descricao: 'Acessar auditoria',
    modulo: 'auditoria',
  },
] as const;

async function main(): Promise<void> {
  // Cria/atualiza a empresa padrão (id fixo 1).
  const empresa = await prisma.empresa.upsert({
    where: { id: 1 },
    update: { nome: 'Empresa Padrão' },
    create: { id: 1, nome: 'Empresa Padrão' },
  });

  // Cria/atualiza cada permissão do catálogo.
  for (const permissao of PERMISSOES) {
    await prisma.permissao.upsert({
      where: { chave: permissao.chave },
      update: { descricao: permissao.descricao, modulo: permissao.modulo },
      create: {
        chave: permissao.chave,
        descricao: permissao.descricao,
        modulo: permissao.modulo,
      },
    });
  }

  // Cria/atualiza o perfil Administrador.
  const perfil = await prisma.perfilAcesso.upsert({
    where: { descricao: 'Administrador' },
    update: { status: true },
    create: { descricao: 'Administrador' },
  });

  // Vincula TODAS as permissões existentes ao perfil Administrador.
  const permissoes = await prisma.permissao.findMany();
  for (const permissao of permissoes) {
    await prisma.permissaoPerfil.upsert({
      where: {
        perfilId_permissaoId: {
          perfilId: perfil.id,
          permissaoId: permissao.id,
        },
      },
      update: {},
      create: { perfilId: perfil.id, permissaoId: permissao.id },
    });
  }

  // Cria o usuário administrador inicial.
  // IMPORTANTE: troque a senha padrão em produção!
  const adminEmail = 'admin@template.local';
  const senhaHash = await hash('Admin@12345', 10);

  await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nome: 'Administrador',
      email: adminEmail,
      senha: senhaHash,
      empresaId: empresa.id,
      perfilAcessoId: perfil.id,
      onboardingCompleto: true,
    },
  });

  console.log('Seed concluído com sucesso:');
  console.log(`  - Empresa:            ${empresa.nome} (${empresa.id})`);
  console.log(`  - Perfil de acesso:   ${perfil.descricao}`);
  console.log(`  - Permissões:         ${permissoes.length}`);
  console.log(`  - Admin:              ${adminEmail} / Admin@12345`);
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    // Garante o fechamento da conexão ao final (sucesso ou erro).
    await prisma.$disconnect();
  });
