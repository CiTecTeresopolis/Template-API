import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

// ============================================================
// UpdatePerfilAcessoDto — payload de atualização de perfil de acesso.
//
// Todos os campos são opcionais: apenas o que for enviado será
// atualizado (PATCH semantics). Se `permissoes` for enviado, a lista
// completa de vínculos é substituída.
// ============================================================
export class UpdatePerfilAcessoDto {
  @ApiProperty({
    example: 'Supervisor',
    description: 'Nome do perfil de acesso',
    required: false,
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({
    example: ['ACESSAR_DASHBOARD', 'ACESSAR_PDV'],
    description: 'Lista de chaves de permissão',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissoes?: string[];

  @ApiProperty({
    example: true,
    description: 'Status do perfil',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
