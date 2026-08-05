import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '../../../auth/auth.guard';
import { Request } from 'express';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: JwtService;

  function createMockContext(authHeader?: string): ExecutionContext {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['authorization'] = authHeader;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }) as unknown as Request,
      }),
    } as ExecutionContext;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('deve lançar 401 quando nenhum token é fornecido', async () => {
    const context = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve lançar 401 quando o token é inválido', async () => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
      new Error('token inválido'),
    );
    const context = createMockContext('Bearer token_invalido');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve retornar true e popular req.user com token válido', async () => {
    const payload = { sub: 1, email: 'test@test.com', empresaId: 1 };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

    const request = {
      headers: { authorization: 'Bearer token_valido' },
    } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as any).user).toEqual(payload);
  });
});
