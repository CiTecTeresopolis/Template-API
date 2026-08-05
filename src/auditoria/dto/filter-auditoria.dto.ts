import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

// ============================================================
// FilterAuditoriaDto — query params do GET /auditoria.
//
// `dataInicio`/`dataFim` são recebidos como ISO strings (@IsDateString)
// e convertidos para Date no controller. `page`/`limit` são convertidos
// de string para number via @Transform.
// ============================================================
export class FilterAuditoriaDto {
  @ApiPropertyOptional({ description: 'Nome do usuário (busca parcial)' })
  @IsOptional()
  @IsString()
  usuarioNome?: string;

  @ApiPropertyOptional({ description: 'Entidade' })
  @IsOptional()
  @IsString()
  entidade?: string;

  @ApiPropertyOptional({ description: 'Ação' })
  @IsOptional()
  @IsString()
  acao?: string;

  @ApiPropertyOptional({ description: 'Data início (ISO)' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data fim (ISO)' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ required: false, default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  page?: number;

  @ApiPropertyOptional({ required: false, default: 50 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 50))
  limit?: number;
}
