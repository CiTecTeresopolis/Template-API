import { LoginDto } from './dto/login-dto';
import { AuthService } from './auth.service';
import { Controller, Body, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

// ============================================================
// AuthController — rotas públicas de autenticação.
//
// Obs.: este controller NÃO usa AuthGuard — o login deve ser acessível
// sem token. Diferente dos controllers de usuário/perfis/auditoria que
// são protegidos por AuthGuard + PermissionsGuard.
// ============================================================
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/login
  // Recebe e-mail e senha e devolve o usuário + token JWT.
  @Post('/login')
  @ApiOperation({ summary: 'Logar' })
  @ApiResponse({ status: 201, description: 'Usuário logado com sucesso!' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas!' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<any> {
    // Captura IP e user-agent da requisição para registrar na auditoria
    // de LOGIN (rastreabilidade de quem acessou de onde).
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    return await this.authService.validarUsuario(
      loginDto.email,
      loginDto.senha,
      ip,
      userAgent,
    );
  }
}
