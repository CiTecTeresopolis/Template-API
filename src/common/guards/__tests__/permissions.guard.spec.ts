import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from '../permissions.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../../decorators/permissions.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let prisma: PrismaService;

  function createMockContext(
    user: any,
    permissions?: string[],
  ): ExecutionContext {
    const handler = () => {};
    if (permissions) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, handler);
    }
    return {
      getHandler: () => handler,
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        Reflector,
        {
          provide: PrismaService,
          useValue: { usuario: { findUnique: jest.fn() } },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('deve permitir quando nenhuma permissão é exigida', async () => {
    const context = createMockContext({ sub: 1 });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('deve lançar 403 quando usuário não está autenticado (sem sub)', async () => {
    const context = createMockContext(undefined, ['TEST']);
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deve permitir quando usuário tem a permissão exigida', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
      perfilAcesso: {
        permissoes: [{ permissao: { chave: 'TEST_PERMISSION' } }],
      },
    });

    const context = createMockContext({ sub: 1 }, ['TEST_PERMISSION']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('deve lançar 403 quando usuário não tem a permissão exigida', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
      perfilAcesso: {
        permissoes: [{ permissao: { chave: 'OTHER_PERMISSION' } }],
      },
    });

    const context = createMockContext({ sub: 1 }, ['TEST_PERMISSION']);
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deve permitir quando usuário tem pelo menos uma das permissões exigidas (some)', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
      perfilAcesso: {
        permissoes: [{ permissao: { chave: 'PERM_A' } }],
      },
    });

    const context = createMockContext({ sub: 1 }, ['PERM_A', 'PERM_B']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
