import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';

// ============================================================
// FilterUserDto — query params do GET /usuario/filtrados.
//
// Os @Transform convertem as strings vindas da query string em tipos
// nativos: "true"/"false" -> boolean e "2" -> number. Sem isso, os
// valores chegariam como string no service.
// ============================================================
export class FilterUserDto {
  @ApiProperty({ required: false, description: 'Nome do usuário' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ required: false, description: 'Email do usuário' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Telefone do usuário' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty({
    required: false,
    description: 'Status do usuário (ativo/inativo)',
  })
  @IsOptional()
  @IsBoolean()
  // Converte a string "true"/"false" da URL em boolean.
  @Transform(({ value }) => (value === 'true' ? true : false))
  ativo?: boolean;

  @ApiProperty({ required: false, default: 1, description: 'Número da página' })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  page?: number;

  @ApiProperty({
    required: false,
    default: 50,
    description: 'Itens por página',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 50))
  limit?: number;
}
