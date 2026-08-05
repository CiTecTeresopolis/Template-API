import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// ============================================================
// PasswordUpdateDto — corpo das rotas de troca de senha.
//
// Usado tanto em "senha/:id" (exige a senha atual) quanto em
// "senha/sem-senha/:id" (o campo senhaAtual é ignorado nesse caso).
// ============================================================
export class PasswordUpdateDto {
  @ApiProperty({
    required: true,
    example: 'exemplo1',
    description: 'Senha Atual do usuário',
  })
  @IsNotEmpty()
  @IsString()
  senhaAtual: string;

  @ApiProperty({
    required: true,
    example: 'exemplo2',
    description: 'Nova Senha do usuário',
  })
  @IsNotEmpty()
  @IsString()
  novaSenha: string;
}
