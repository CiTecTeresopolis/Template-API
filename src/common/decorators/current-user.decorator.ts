import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// ============================================================
// current-user.decorator.ts — Decorator de parâmetro.
//
// Uso: async metodo(@CurrentUser() user: JwtPayload) { ... }
// Retorna o payload do JWT que foi gravado em `request.user` pelo
// AuthGuard. Se nenhum dado extra for passado (data), retorna o objeto
// completo do usuário autenticado.
// ============================================================
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // O AuthGuard popula `request.user` com o payload decodificado do token.
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
