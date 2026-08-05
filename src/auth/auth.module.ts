import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { UsuarioModule } from 'src/usuario/usuario.module';
import { PasswordService } from 'src/usuario/password/password.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PerfilAcessoController } from './perfil-acesso.controller';
import { PerfilAcessoService } from './perfil-acesso.service';
import { PermissaoController } from './permissao.controller';
import { PermissaoService } from './permissao.service';

// ============================================================
// AuthModule — módulo de autenticação e autorização.
//
// Agrupa:
//   - login (POST /auth/login) e emissão de JWT;
//   - CRUD de perfis de acesso (perfis-acesso);
//   - listagem de permissões (permissoes).
//
// O JwtModule é configurado aqui com o segredo e o tempo de expiração
// lidos das variáveis de ambiente. AuthGuard/PermissionsGuard são usados
// pelos controllers via decorators, sem precisar ser re-importados.
// ============================================================
@Module({
  imports: [
    // Fornece UsuarioService e PasswordService (para validar login).
    UsuarioModule,
    // Prisma é global, mas é declarado explicitamente por clareza.
    PrismaModule,
    // Configura o módulo JWT com as variáveis de ambiente.
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ||
          '8h') as JwtSignOptions['expiresIn'],
      },
    }),
  ],
  providers: [
    AuthService,
    PasswordService,
    PerfilAcessoService,
    PermissaoService,
  ],
  controllers: [AuthController, PerfilAcessoController, PermissaoController],
  exports: [PerfilAcessoService, PermissaoService],
})
export class AuthModule {}
