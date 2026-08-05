//auth.service.ts
import { JwtService } from '@nestjs/jwt';
import { UsuarioService } from '../usuario/usuario.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordService } from '../usuario/password/password.service';
import { AuditService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';

// Formato da resposta do login. Note que a senha NUNCA é incluída.
interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  token: string;
  usuarioAlteracaoId: number | null;
  empresaId: number;
  comissao: number | null;
  permissoes: string[];
  perfilAcesso: { id: number; descricao: string } | null;
  onboardingCompleto: boolean;
  modulosDesativados: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private passwordService: PasswordService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private prisma: PrismaService,
  ) {}

  // ============================================================
  // Fluxo de autenticação (login):
  //   1. busca o usuário ativo pelo e-mail (com perfil e permissões);
  //   2. compara a senha informada com o hash bcrypt salvo;
  //   3. se válida, gera o token JWT;
  //   4. monta a lista de permissões do perfil do usuário;
  //   5. registra auditoria de LOGIN;
  //   6. monta a resposta sem a senha + módulos desativados da empresa.
  // ============================================================
  async validarUsuario(
    email: string,
    senha: string,
    ip?: string,
    userAgent?: string,
  ): Promise<UsuarioResponse> {
    const usuario = await this.usuarioService.getUserByEmail(email);
    if (!usuario) {
      // Mesma mensagem tanto para e-mail inexistente quanto senha errada,
      // para não vazar quais e-mails estão cadastrados no sistema.
      throw new UnauthorizedException('Usuário ou Senha Inválidos');
    }
    const compare = await this.passwordService.comparePassword(
      senha,
      usuario.senha,
    );
    if (compare) {
      const token = this.gerarToken(usuario);

      // Extrai as chaves de permissão do perfil do usuário
      // (ex.: ["GERENCIAR_USUARIOS", "ACESSAR_AUDITORIA"]).
      const perfilAcesso = (usuario as any).perfilAcesso;
      const permissoes: string[] = [];
      if (perfilAcesso?.permissoes) {
        for (const pp of perfilAcesso.permissoes) {
          permissoes.push(pp.permissao.chave);
        }
      }

      // Registra o login na auditoria. O catch evita que a falha na
      // auditoria (ex.: banco indisponível) derrube a autenticação.
      this.auditService
        .log({
          usuarioId: usuario.id,
          acao: 'LOGIN',
          entidade: 'Usuario',
          entidadeId: usuario.id,
          ip,
          userAgent,
        })
        .catch((err) => {
          console.error('Erro ao registrar auditoria de login:', err);
        });

      // Monta a resposta, excluindo o campo `senha`.
      const usuarioSemSenha: UsuarioResponse = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        ativo: usuario.ativo,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
        token: token.access_token,
        usuarioAlteracaoId: usuario.usuarioAlteracaoId,
        empresaId: usuario.empresaId,
        comissao: usuario.comissao,
        permissoes,
        perfilAcesso: perfilAcesso
          ? { id: perfilAcesso.id, descricao: perfilAcesso.descricao }
          : null,
        onboardingCompleto: usuario.onboardingCompleto,
        modulosDesativados: [],
      };

      // Busca os módulos desativados configurados na empresa do usuário.
      // O campo é armazenado como JSON string no banco (coluna String?).
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: usuario.empresaId },
        select: { modulosDesativados: true },
      });
      if (empresa?.modulosDesativados) {
        try {
          usuarioSemSenha.modulosDesativados = JSON.parse(
            empresa.modulosDesativados,
          );
        } catch {
          // JSON inválido no banco -> trata como lista vazia.
          usuarioSemSenha.modulosDesativados = [];
        }
      }

      return usuarioSemSenha;
    }
    throw new UnauthorizedException('Usuário ou Senha Inválidos');
  }

  // Gera o par de token JWT. O payload carrega `sub` (id do usuário),
  // `email` e `empresaId`. O `sub` é usado pelo PermissionsGuard para
  // identificar o usuário.
  gerarToken(payload: { id: number; email: string; empresaId: number }) {
    return {
      access_token: this.jwtService.sign({
        sub: payload.id,
        email: payload.email,
        empresaId: payload.empresaId,
      }),
    };
  }
}
