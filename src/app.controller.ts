import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

// ============================================================
// AppController — controller de exemplo do módulo raiz.
//
// Expõe a rota base da API ("/") usada como health check simples.
// Obs.: este controller NÃO fica atrás do AuthGuard; por isso ele é
// excluído do prefixo global e fica acessível em "http://localhost:3000/".
// ============================================================
@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Rota base da API',
    description: 'Retorna uma mensagem de boas-vindas da aplicação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensagem de boas-vindas retornada com sucesso.',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
