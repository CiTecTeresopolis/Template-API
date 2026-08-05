import { SetMetadata } from '@nestjs/common';

// ============================================================
// permissions.decorator.ts — Decorator de permissões (RBAC).
//
// Uso: @Permissions('GERENCIAR_USUARIOS', 'ACESSAR_AUDITORIA')
// O PermissionsGuard (common/guards/permissions.guard.ts) lê o metadata
// registrado aqui e libera/bloqueia a requisição comparando com as
// permissões do perfil do usuário autenticado.
//
// Sem argumentos (@Permissions()) = rota pública para qualquer usuário
// autenticado (sem exigência de permissão específica).
// ============================================================

// Chave usada no Metadata do Nest para identificar este decorator.
export const PERMISSIONS_KEY = 'permissions';

// Factory que grava a lista de permissões exigidas no metadata do handler.
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
