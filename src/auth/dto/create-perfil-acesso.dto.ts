import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

// ============================================================
// CreatePerfilAcessoDto — payload de criação de perfil de acesso.
//
// `permissoes` recebe um array de CHAVES (ex.: "ACESSAR_AUDITORIA").
// O PerfilAcessoService converte essas chaves em vínculos
// PermissaoPerfil.
// ============================================================
export class CreatePerfilAcessoDto {
  @ApiProperty({
    example: 'Administrador',
    description: 'Nome do perfil de acesso',
  })
  @IsString()
  descricao: string;

  @ApiProperty({
    example: ['ACESSAR_DASHBOARD', 'ACESSAR_AUDITORIA'],
    description: 'Lista de chaves de permissão',
  })
  @IsArray() // precisa ser um array
  @IsString({ each: true }) // e cada item precisa ser string
  permissoes: string[];

  @ApiProperty({
    example: true,
    description: 'Status do perfil',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
