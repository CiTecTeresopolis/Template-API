import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

// ============================================================
// AuthGuard — guard de AUTENTICAÇÃO (valida o token JWT).
//
// Uso: @UseGuards(AuthGuard) (ex.: junto com PermissionsGuard).
// O que ele faz:
//   1. extrai o token do header Authorization ("Bearer <jwt>");
//   2. valida o token usando o segredo do ambiente (JWT_SECRET);
//   3. grava o payload decodificado em `request.user` para os próximos
//      passos da cadeia (PermissionsGuard, @CurrentUser, controllers).
// Sem token ou com token inválido -> 401 Unauthorized.
// ============================================================
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Busca o token do header Authorization no formato Bearer <jwt>.
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      // Valida o token JWT com o segredo configurado no ambiente.
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Salva o payload decodificado na request para que os controllers
      // e outros guards consigam identificar o usuário autenticado.
      (request as any)['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  // Extrai apenas a parte do token (segunda palavra) do header.
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
