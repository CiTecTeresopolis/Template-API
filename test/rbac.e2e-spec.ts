import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { AuthGuard } from '../src/auth/auth.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { PrismaService } from '../src/prisma/prisma.service';

import { PermissaoController } from '../src/auth/permissao.controller';
import { PermissaoService } from '../src/auth/permissao.service';

import { PerfilAcessoController } from '../src/auth/perfil-acesso.controller';
import { PerfilAcessoService } from '../src/auth/perfil-acesso.service';

const mockJwtService = {
  verifyAsync: jest
    .fn()
    .mockResolvedValue({ sub: 1, email: 'test@test.com', empresaId: 1 }),
};

function createMockPrisma(permissoes: string[]) {
  return {
    usuario: {
      findUnique: jest.fn().mockResolvedValue({
        perfilAcesso: {
          permissoes: permissoes.map((chave) => ({
            permissao: { chave },
          })),
        },
      }),
    },
  };
}

async function createTestApp(
  controllers: any[],
  providers: { provide: any; useValue: any }[],
  permissions: string[],
): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers,
    providers: [
      AuthGuard,
      PermissionsGuard,
      Reflector,
      { provide: JwtService, useValue: mockJwtService },
      { provide: PrismaService, useValue: createMockPrisma(permissions) },
      ...providers,
    ],
  }).compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

function requestWithoutToken(app: INestApplication) {
  return request(app.getHttpServer());
}

function requestWithToken(
  app: INestApplication,
  path: string,
  token = 'Bearer token_valido',
) {
  return request(app.getHttpServer()).get(path).set('Authorization', token);
}

afterEach(async () => {
  jest.clearAllMocks();
});

// ─── PermissaoController (método-level guard) ───────────────────

describe('GET /api/permissoes', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('deve retornar 401 sem token', async () => {
    app = await createTestApp(
      [PermissaoController],
      [{ provide: PermissaoService, useValue: { listar: jest.fn() } }],
      [],
    );
    await requestWithoutToken(app).get('/api/permissoes').expect(401);
  });

  it('deve retornar 403 com token sem permissão', async () => {
    app = await createTestApp(
      [PermissaoController],
      [{ provide: PermissaoService, useValue: { listar: jest.fn() } }],
      ['OUTRA_PERMISSAO'],
    );
    await requestWithToken(app, '/api/permissoes').expect(403);
  });

  it('deve retornar 200 com token e permissão correta', async () => {
    app = await createTestApp(
      [PermissaoController],
      [
        {
          provide: PermissaoService,
          useValue: { listar: jest.fn().mockResolvedValue([]) },
        },
      ],
      ['GERENCIAR_PERFIS_ACESSO'],
    );
    await requestWithToken(app, '/api/permissoes').expect(200);
  });
});

// ─── PerfilAcessoController (classe-level guard) ────────────────

describe('GET /api/perfis-acesso', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('deve retornar 401 sem token', async () => {
    app = await createTestApp(
      [PerfilAcessoController],
      [{ provide: PerfilAcessoService, useValue: { listar: jest.fn() } }],
      [],
    );
    await requestWithoutToken(app).get('/api/perfis-acesso').expect(401);
  });

  it('deve retornar 403 com token sem permissão', async () => {
    app = await createTestApp(
      [PerfilAcessoController],
      [{ provide: PerfilAcessoService, useValue: { listar: jest.fn() } }],
      ['OUTRA_PERMISSAO'],
    );
    await requestWithToken(app, '/api/perfis-acesso').expect(403);
  });

  it('deve retornar 200 com token e permissão correta', async () => {
    app = await createTestApp(
      [PerfilAcessoController],
      [
        {
          provide: PerfilAcessoService,
          useValue: { listar: jest.fn().mockResolvedValue([]) },
        },
      ],
      ['GERENCIAR_PERFIS_ACESSO'],
    );
    await requestWithToken(app, '/api/perfis-acesso').expect(200);
  });
});
