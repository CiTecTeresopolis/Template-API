import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

// ============================================================
// UpdateUserDto — payload de atualização de usuário.
//
// Todos os campos são opcionais (apenas o que for enviado é alterado).
// `perfilAcessoId` aceita null para DESVINCULAR o perfil do usuário
// (o service trata null/0 como disconnect).
// ============================================================
export class UpdateUserDto {
  @ApiProperty({
    required: false,
    example: 'Usuário Teste Editado',
    description: 'Nome do usuário',
  })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({
    required: false,
    example: 'teste@gmail.com',
    description: 'Email do usuário',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    required: false,
    example: 'teste123',
    description: 'Senha do usuário',
  })
  @IsOptional()
  @IsString()
  senha?: string;

  @ApiProperty({
    required: false,
    example: '86987436809',
    description: 'Telefone do usuário',
  })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Token do usuário',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'Porcentagem de Comissão (%)',
  })
  @IsOptional()
  @IsInt()
  comissao: number;

  @ApiProperty({
    required: false,
    example: true,
    description: 'Status do usuário (ativo/inativo)',
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'ID do perfil de acesso (null para remover)',
  })
  @IsOptional()
  perfilAcessoId?: number | null;
}
