import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsuarioService } from '../../usuario/usuario.service';
import { PasswordService } from '../../usuario/password/password.service';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../../auditoria/auditoria.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let usuarioService: UsuarioService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let passwordService: PasswordService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsuarioService,
          useValue: {
            getUserByEmail: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            comparePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            empresa: {
              findUnique: jest.fn(),
            },
            usuario: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usuarioService = module.get<UsuarioService>(UsuarioService);
    passwordService = module.get<PasswordService>(PasswordService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
