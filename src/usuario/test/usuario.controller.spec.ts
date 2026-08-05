import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioController } from '../usuario.controller';
import { UsuarioService } from '../usuario.service';
import { AuthGuard } from '../../auth/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsuarioController', () => {
  let controller: UsuarioController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: UsuarioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuarioController],
      providers: [
        {
          provide: UsuarioService,
          useValue: {
            createUser: jest.fn(),
            getUsers: jest.fn(),
            getfilterUsers: jest.fn(),
            getUserById: jest.fn(),
            updateUser: jest.fn(),
            disableUser: jest.fn(),
            enableUser: jest.fn(),
            updatePassword: jest.fn(),
            updatePasswordWithoutPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            usuario: {
              findUnique: jest.fn(() => ({
                perfilAcesso: { permissoes: [] },
              })),
            },
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsuarioController>(UsuarioController);
    service = module.get<UsuarioService>(UsuarioService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
