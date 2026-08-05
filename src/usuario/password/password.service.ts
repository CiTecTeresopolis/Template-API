import * as bcrypt from 'bcryptjs';
import { Injectable } from '@nestjs/common';

// ============================================================
// PasswordService — hashing e comparação de senhas (bcrypt).
//
// bcrypt adiciona um salt automático a cada hash, tornando inviável o
// uso de tabelas rainbow. O `saltRounds` define o custo computacional:
// quanto maior, mais seguro (e mais lento). 10 é um valor equilibrado.
// ============================================================
@Injectable()
export class PasswordService {
  // Número de rounds do salt (custo) usado no hash.
  private readonly saltRounds = 10;

  // Gera o hash seguro da senha para ser salvo no banco.
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  // Compara uma senha em texto puro com o hash salvo. Retorna true
  // se forem equivalentes.
  async comparePassword(password: string, hash: string): Promise<boolean> {
    // console.log('Comparing password:', password, 'with hash:', hash);
    return bcrypt.compare(password, hash);
  }
}
