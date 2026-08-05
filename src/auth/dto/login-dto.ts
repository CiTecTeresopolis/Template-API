import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// ============================================================
// LoginDto — corpo da requisição POST /auth/login.
//
// As regras de validação (class-validator) são aplicadas pelo
// ValidationPipe global de main.ts. Os decorators @ApiProperty
// alimentam o Swagger com exemplos e descrições.
// ============================================================
export class LoginDto {
  @ApiProperty({
    required: true,
    example: 'teste@gmail.com',
    description: 'Email do usuário',
  })
  @IsNotEmpty() // não pode ser vazio
  @IsEmail() // precisa ter formato de e-mail válido
  email: string;

  @ApiProperty({
    required: true,
    example: 'teste1234',
    description: 'Senha do usuário',
  })
  @IsNotEmpty()
  @IsString()
  senha: string;
}
