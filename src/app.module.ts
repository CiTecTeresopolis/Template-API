import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { UsuarioModule } from './usuario/usuario.module';
import { LoggerModule } from './logger/logger.module';
import { AuditoriaModule } from './auditoria/auditoria.module';

// ============================================================
// AppModule — módulo raiz da aplicação.
//
// Todo módulo NestJS usado no projeto precisa ser declarado aqui
// (ou importado por um dos módulos listados). É aqui que o Nest
// monta a árvore de dependências do projeto.
// ============================================================
@Module({
  imports: [
    // Carrega as variáveis de ambiente da aplicação.
    ConfigModule.forRoot(),
    // Integração com o Prisma e acesso ao banco.
    PrismaModule,
    // Serviço de logs global da aplicação.
    LoggerModule,
    // Módulo de auditoria, usado para registrar ações no sistema.
    AuditoriaModule,
    // Gestão de usuários.
    UsuarioModule,
    // Autenticação, perfis de acesso e permissões.
    AuthModule,
  ],
  // Controllers do módulo raiz (apenas a rota base "/").
  controllers: [AppController],
  // Providers disponíveis no módulo raiz.
  providers: [AppService, PrismaService],
})
export class AppModule {}
