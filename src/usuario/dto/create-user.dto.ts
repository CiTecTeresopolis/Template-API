import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

// ============================================================
// CreateUserDto — payload de criação de usuário.
//
// Regras de validação aplicadas pelo ValidationPipe global.
// Nota: `comissao` está tipado como number mas sem decorator de tipo
// (apenas @IsInt) — preencha conforme a necessidade do seu domínio.
// ============================================================
export class CreateUserDto {
  @ApiProperty({
    required: true,
    example: 'Usuário Teste',
    description: 'Nome do usuário',
  })
  @IsNotEmpty() // obrigatório
  @IsString()
  nome: string;

  @ApiProperty({
    required: true,
    example: 'teste@gmail.com',
    description: 'Email do usuário',
  })
  @IsNotEmpty()
  @IsEmail() // formato de e-mail válido
  email: string;

  @ApiProperty({
    required: true,
    example: 'teste123',
    description: 'Senha do usuário',
  })
  @IsNotEmpty()
  @IsString()
  senha: string;

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
    description: 'ID do perfil de acesso',
  })
  @IsOptional()
  perfilAcessoId?: number;
}
