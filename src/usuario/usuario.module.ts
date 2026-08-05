import { Module } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { PasswordService } from './password/password.service';
import { JwtService } from '@nestjs/jwt';

// ============================================================
// UsuarioModule — módulo de gestão de usuários.
//
// O UsuarioService é exportado porque o AuthService precisa dele para
// validar o login (getUserByEmail). O JwtService é declarado aqui para
// que o UsuarioService possa gerar tokens ao criar um usuário.
// ============================================================
@Module({
  providers: [UsuarioService, PasswordService, JwtService],
  controllers: [UsuarioController],
  exports: [UsuarioService],
})
export class UsuarioModule {}
