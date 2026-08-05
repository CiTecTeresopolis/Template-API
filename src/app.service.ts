import { Injectable } from '@nestjs/common';

// ============================================================
// AppService — lógica de negócio do módulo raiz.
//
// Serviços no NestJS são classes @Injectable() que concentram a
// lógica de negócio, mantendo os controllers enxutos.
// ============================================================
@Injectable()
export class AppService {
  getHello(): string {
    // Mensagem retornada na rota base "/" (health check simples).
    return 'API saudável';
  }
}
