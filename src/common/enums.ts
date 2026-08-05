// ============================================================
// enums.ts — Enums globais compartilhados.
//
// Obs.: este enum está disponível no código, porém o controle de acesso
// atual é baseado em permissões (RBAC via tabela Permissao), e não no
// campo `role` do usuário. Ele é mantido como referência/evolução futura.
// ============================================================

// Role do Usuário (Baseado no app_role)
export enum AppRole {
  ADMINISTRADOR = 'administrador',
  COLABORADOR = 'colaborador',
}
