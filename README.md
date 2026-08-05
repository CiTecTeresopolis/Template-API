# Template API

Template de API REST pronto para uso com **NestJS 11**, **Prisma 6** e autenticação por **JWT + RBAC**. Inclui a base essencial para aplicações de gestão: usuários, autenticação, perfis de acesso, permissões e auditoria.

## Índice

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
  - [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados (Prisma)](#banco-de-dados-prisma)
- [Seed de dados iniciais](#seed-de-dados-iniciais)
- [Executando a API](#executando-a-api)
- [Autenticação e RBAC](#autenticação-e-rbac)
- [Endpoints](#endpoints)
- [Documentação Swagger](#documentação-swagger)
- [Testes](#testes)
- [Qualidade e build](#qualidade-e-build)
- [Modelo de dados](#modelo-de-dados)
- [Indo para produção](#indo-para-produção)
- [Troubleshooting](#troubleshooting)
- [Contribuição](#contribuição)
- [Licença](#licença)

## Visão geral

O template foi pensado para acelerar o início de novos projetos com uma arquitetura já organizada, mantendo boas práticas de segurança, validação, documentação e integração com banco de dados.

**Objetivos:**

- servir como base para APIs internas ou externas;
- fornecer autenticação e autorização (JWT + RBAC) já organizadas;
- permitir desenvolvimento rápido com banco local em SQLite;
- manter documentação automática com Swagger;
- centralizar regras de auditoria e controle de acesso.

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | [NestJS 11](https://nestjs.com/) + TypeScript |
| ORM | [Prisma 6](https://www.prisma.io/) |
| Banco (dev) | SQLite (local, sem servidor) |
| Banco (prod) | PostgreSQL / MySQL / SQL Server |
| Autenticação | JWT (`@nestjs/jwt`) |
| Autorização | RBAC por chaves de permissão |
| Documentação | Swagger / OpenAPI (`@nestjs/swagger`) |
| Logging | Winston + rotação diária |
| Validação | `class-validator` + `class-transformer` |
| Segurança | Helmet, CORS configurável |
| Testes | Jest + ts-jest (unitário e e2e) |
| Qualidade | ESLint + Prettier |

## Arquitetura

O projeto segue o padrão de módulos do NestJS: cada domínio é um módulo independente com `controller` (HTTP), `service` (regras de negócio), `dto` (validação) e, quando necessário, sub-pastas.

```text
Requisição HTTP
      │
      ▼
┌──────────────────┐   main.ts (global): Helmet, CORS, prefixo,
│   Controllers    │   ValidationPipe, filtro de exceções
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  AuthGuard       │  valida o token JWT e injeta req.user
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ PermissionsGuard │  confere as permissões exigidas (@Permissions)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│    Services      │  regras de negócio + auditoria
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  PrismaService   │  acesso ao banco (SQLite/Postgres/...)
└──────────────────┘
```

**Fluxo de uma requisição protegida (ex.: `GET /usuario`):**

1. O cliente envia `Authorization: Bearer <token>`.
2. `AuthGuard` extrai e valida o JWT (segredo `JWT_SECRET`); grava o payload em `request.user`.
3. `PermissionsGuard` lê o metadata `@Permissions('GERENCIAR_USUARIOS')` e consulta o perfil do usuário no banco.
4. Se o usuário possuir a permissão, o fluxo segue para o `UsuarioService`, que consulta o banco via `PrismaService`.
5. Erros são centralizados no `AllExceptionsFilter`, que registra no Winston e devolve JSON padronizado.

## Estrutura do projeto

```text
template-api/
├── prisma/
│   ├── schema.prisma       # schema do banco (fonte de verdade)
│   ├── seed.ts             # dados iniciais (idempotente)
│   ├── config.ts           # configuração do Prisma CLI
│   ├── migrations/         # migrações SQL
│   └── dev.db              # banco SQLite local de desenvolvimento
├── src/
│   ├── main.ts             # bootstrap da aplicação (middlewares, Swagger)
│   ├── app.module.ts       # módulo raiz
│   ├── app.controller.ts   # rota base "/" (health check)
│   ├── app.service.ts
│   ├── auth/               # login, JWT, perfis de acesso e permissões
│   │   ├── auth.controller.ts / auth.service.ts / auth.guard.ts
│   │   ├── perfil-acesso.controller.ts / perfil-acesso.service.ts
│   │   ├── permissao.controller.ts / permissao.service.ts
│   │   ├── dto/            # DTOs de auth (login, perfis)
│   │   └── test/           # testes unitários de auth
│   ├── usuario/            # CRUD de usuários e gestão de senha
│   │   ├── usuario.controller.ts / usuario.service.ts / usuario.module.ts
│   │   ├── password/       # hashing bcrypt
│   │   ├── dto/            # DTOs de usuário
│   │   └── test/           # testes unitários de usuário
│   ├── auditoria/          # registro e consulta de auditoria
│   │   ├── auditoria.controller.ts / auditoria.service.ts / auditoria.module.ts
│   │   └── dto/
│   ├── common/             # guards, decorators, filtros e enums
│   │   ├── guards/         # AuthGuard, PermissionsGuard
│   │   ├── decorators/     # @Permissions, @CurrentUser
│   │   ├── filters/        # AllExceptionsFilter
│   │   └── enums.ts
│   ├── logger/             # logging com Winston (global)
│   ├── prisma/             # PrismaModule + PrismaService (global)
│   └── generated/          # cliente Prisma gerado (não versionar)
└── test/                   # testes e2e (app, rbac)
```

> **Nota:** a pasta `src/generated/` é criada pelo `prisma generate` e está no `.gitignore`.

## Pré-requisitos

- [Node.js](https://nodejs.org/) **20+**
- npm (ou pnpm/yarn)
- SQLite local (para desenvolvimento — não requer servidor externo)

## Configuração

> **Importante:** o SQLite neste template é apenas para desenvolvimento e testes locais. Para produção ou uso real, troque o `DATABASE_URL` por um banco robusto (PostgreSQL, MySQL ou SQL Server) e ajuste o `provider` em `prisma/schema.prisma`.

1. Instale as dependências:

   ```bash
   npm install
   ```

   O script `postinstall` já executa `prisma generate` automaticamente.

2. Crie o arquivo de variáveis de ambiente:

   ```bash
   # Windows (PowerShell)
   Copy-Item .env.example .env

   # Linux/macOS
   cp .env.example .env
   ```

3. Ajuste as variáveis conforme o seu ambiente (veja a tabela abaixo).

### Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente de execução (`development` ou `production`) |
| `PORT` | `3000` | Porta do servidor HTTP |
| `APP_PREFIX` | `template-api` | Prefixo global das rotas da API |
| `DATABASE_URL` | `file:./dev.db` | String de conexão do banco |
| `JWT_SECRET` | `change-me-em-producao` | Segredo para assinatura dos tokens JWT |
| `JWT_EXPIRES_IN` | `8h` | Validade do token JWT |
| `CORS_ORIGINS` | origens locais | Origens permitidas (separadas por vírgula) |
| `LOG_DIR` | `./logs` | Diretório dos arquivos de log (produção) |
| `LOG_LEVEL` | `info` | Nível de log do Winston |

## Banco de dados (Prisma)

```bash
# Gera o cliente Prisma (também roda no npm install)
npx prisma generate

# Cria/sincroniza o banco local com o schema atual (apenas para dev)
npx prisma db push

# Alternativa com migrações versionadas (recomendado para produção)
npm run prisma:migrate        # cria uma nova migração (dev)
npm run prisma:migrate:deploy # aplica migrações pendentes (produção)

# Abre o Prisma Studio (visualização/edição do banco no navegador)
npm run prisma:studio
```

> Em desenvolvimento você pode usar `npx prisma db push` por simplicidade. Em times, prefira migrações (`npm run prisma:migrate`) para versionar as mudanças de schema.

## Seed de dados iniciais

O seed inicializa as entidades básicas:

- empresa padrão;
- perfil de administrador;
- permissões mínimas;
- usuário administrador de teste.

```bash
npm run prisma:seed
```

**Credenciais padrão do seed:**

```text
E-mail:  admin@template.local
Senha:   Admin@12345
```

> **Atenção:** troque essa senha imediatamente em qualquer ambiente real.

## Executando a API

### Modo desenvolvimento (com watch)

```bash
npm run start:dev
```

### Modo produção

```bash
npm run build
npm run start:prod
```

Por padrão, o servidor escuta apenas em `127.0.0.1`. Para expor a API publicamente, remova o host em `src/main.ts` ou use um proxy reverso (Nginx/Caddy).

## Autenticação e RBAC

### Login

```bash
curl -X POST http://localhost:3000/template-api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@template.local","senha":"Admin@12345"}'
```

Resposta (resumo):

```json
{
  "id": 1,
  "nome": "Administrador",
  "email": "admin@template.local",
  "token": "<jwt>",
  "permissoes": ["GERENCIAR_USUARIOS", "GERENCIAR_PERFIS_ACESSO", "ACESSAR_AUDITORIA"],
  "perfilAcesso": { "id": 1, "descricao": "Administrador" }
}
```

O JWT carrega no payload: `sub` (id do usuário), `email` e `empresaId`.

### Enviando o token nas rotas protegidas

```bash
curl http://localhost:3000/template-api/usuario \
  -H "Authorization: Bearer <token>"
```

### Headers customizados

- `x-empresa-id` — identifica a empresa na criação de usuário;
- `x-usuario-id` — identifica quem executa a ação (usado na auditoria).

### Modelo RBAC

```text
Permissao ──< PermissaoPerfil >── PerfilAcesso ──< Usuario
   chave       (N:N)               descricao
```

- `Permissao` guarda a **chave** (ex.: `GERENCIAR_USUARIOS`).
- `PerfilAcesso` agrupa um conjunto de permissões (ex.: "Administrador").
- O `PermissionsGuard` compara as chaves do perfil do usuário com as exigidas pelo decorator `@Permissions`.
- Rotas com `@Permissions()` sem chaves exigem apenas usuário autenticado.
- O perfil **"Administrador"** é protegido no service: não pode ser editado nem excluído.

## Endpoints

> Todos os endpoints abaixo (exceto `auth/login` e `/`) exigem `Authorization: Bearer <token>`.
> Prefixo global: `APP_PREFIX` (padrão `template-api`).

### Auth — `auth`

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| POST | `/auth/login` | pública | Autentica e retorna o token JWT |

### Usuários — `usuario`

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| POST | `/usuario` | `GERENCIAR_USUARIOS` | Cadastra usuário (headers `x-empresa-id`, `x-usuario-id`) |
| GET | `/usuario` | `GERENCIAR_USUARIOS` | Lista todos os usuários |
| GET | `/usuario/filtrados` | `GERENCIAR_USUARIOS` | Lista usuários com filtros e paginação |
| GET | `/usuario/:id` | `GERENCIAR_USUARIOS` | Busca usuário por ID |
| PUT | `/usuario/:id` | `GERENCIAR_USUARIOS` | Atualiza usuário |
| PUT | `/usuario/desabilitar/:id` | `GERENCIAR_USUARIOS` | Desativa usuário (deleção lógica) |
| PUT | `/usuario/habilitar/:id` | `GERENCIAR_USUARIOS` | Reativa usuário |
| PUT | `/usuario/senha/:id` | autenticado | Troca senha exigindo a senha atual |
| PUT | `/usuario/senha/sem-senha/:id` | `GERENCIAR_USUARIOS` | Reset de senha (sem exigir a atual) |
| PUT | `/usuario/onboarding/:id` | autenticado | Marca onboarding como concluído |

### Perfis de acesso — `perfis-acesso`

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/perfis-acesso` | `GERENCIAR_PERFIS_ACESSO` | Lista perfis com paginação |
| GET | `/perfis-acesso/:id` | `GERENCIAR_PERFIS_ACESSO` | Busca perfil por ID |
| POST | `/perfis-acesso` | `GERENCIAR_PERFIS_ACESSO` | Cria perfil (body com chaves de permissão) |
| PUT | `/perfis-acesso/:id` | `GERENCIAR_PERFIS_ACESSO` | Atualiza perfil |
| DELETE | `/perfis-acesso/:id` | `GERENCIAR_PERFIS_ACESSO` | Exclui perfil |

### Permissões — `permissoes`

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/permissoes` | `GERENCIAR_PERFIS_ACESSO` | Lista todas as permissões disponíveis |

### Auditoria — `auditoria`

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/auditoria` | `ACESSAR_AUDITORIA` | Consulta auditoria com filtros e paginação |

**Filtros da auditoria** (query params): `usuarioNome`, `entidade`, `acao`, `dataInicio`, `dataFim`, `page`, `limit`.

**Padrão de paginação das listagens** (`GET /usuario/filtrados`, `GET /perfis-acesso`, `GET /auditoria`):

```json
{
  "data": [],
  "meta": { "total": 0, "page": 1, "limit": 50, "totalPages": 0 }
}
```

## Documentação Swagger

A API expõe a documentação interativa (Swagger UI) no mesmo prefixo da API:

```text
http://localhost:3000/template-api
```

No Swagger você pode:

- ver todos os endpoints e seus DTOs;
- autenticar via botão **Authorize** (coloque o token JWT obtido no login);
- executar requisições direto no navegador.

A rota raiz da aplicação fica em `http://localhost:3000/` (health check, retorna `API saudável`).

## Testes

```bash
# Testes unitários
npm test

# Modo watch
npm run test:watch

# Cobertura
npm run test:cov

# Testes e2e
npm run test:e2e
```

- Testes unitários: `*.spec.ts` (services, controllers e guards).
- Testes e2e: `test/*.e2e-spec.ts` (inclui cenários de RBAC — 401/403/200).

## Qualidade e build

```bash
npm run lint     # ESLint (com --fix)
npm run format   # Prettier
npm run build    # compilação NestJS para ./dist
```

## Modelo de dados

Os principais modelos definidos em [prisma/schema.prisma](prisma/schema.prisma):

| Modelo | Descrição |
|---|---|
| `Empresa` | Entidade raiz; usuários pertencem a uma empresa |
| `Usuario` | Usuários do sistema (senha com hash bcrypt) |
| `PerfilAcesso` | Perfis RBAC (ex.: Administrador) |
| `Permissao` | Chaves de permissão (ex.: `GERENCIAR_USUARIOS`) |
| `PermissaoPerfil` | Tabela N:N entre Perfil e Permissão |
| `Auditoria` | Trilha de auditoria de ações do sistema |

## Indo para produção

Checklist antes de publicar a API:

1. **Banco de dados** — troque o SQLite por PostgreSQL/MySQL/SQL Server:
   - atualize o `provider` em `prisma/schema.prisma`;
   - atualize `DATABASE_URL` no `.env`;
   - gere as migrações e aplique com `npm run prisma:migrate:deploy`.
2. **Segredo do JWT** — gere um `JWT_SECRET` forte e único (`openssl rand -hex 64`).
3. **Senha do admin** — troque a senha padrão do seed.
4. **CORS** — restrinja `CORS_ORIGINS` às origens do seu front-end.
5. **`NODE_ENV=production`** — ativa logs em JSON + rotação diária de arquivos (e oculta stack traces nas respostas de erro).
6. **Exposição** — rode atrás de um proxy reverso (HTTPS) ou ajuste o host de listen.
7. **Rate limiting** — considere adicionar `@nestjs/throttler` em rotas públicas como o login.
8. **Backup dos logs** — o `LOG_DIR` é onde o Winston grava `error-*.log` e `combined-*.log`.

## Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| `P2002` ao cadastrar usuário | E-mail duplicado | O endpoint já devolve 409 com mensagem amigável |
| `401 Unauthorized` | Token ausente/expirado/inválido | Gere um novo token via `/auth/login` |
| `403 Acesso negado` | Usuário sem a permissão exigida | Vincule o perfil correto ao usuário |
| Cliente Prisma não encontrado | `src/generated` ausente | Rode `npx prisma generate` |
| Erro de conexão com o banco | `DATABASE_URL` errado | Confira o `.env` e rode `npx prisma db push` |
| Porta em uso | `PORT` ocupada | Altere `PORT` no `.env` |
| Swagger não abre | Prefixo errado | Use `http://localhost:3000/<APP_PREFIX>` |
| Mudanças no schema não aparecem | Cliente desatualizado | Rode `npx prisma generate` e `npx prisma db push` |

## Contribuição

1. Faça um fork do repositório.
2. Crie uma branch: `git checkout -b feat/minha-feature`.
3. Faça as alterações seguindo os padrões do projeto (ESLint/Prettier).
4. Adicione/ajuste testes (`*.spec.ts` e e2e quando aplicável).
5. Envie um Pull Request descrevendo a mudança.

## Licença

Este projeto é distribuído sob a licença `UNLICENSED` (código privado). Consulte `package.json`.
