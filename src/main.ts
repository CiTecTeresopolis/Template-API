// ============================================================
// main.ts — Ponto de entrada da aplicação NestJS.
//
// Responsável por:
//   - criar a instância do NestJS a partir do AppModule;
//   - aplicar middlewares de segurança (Helmet) e CORS;
//   - definir o prefixo global das rotas e limites do body-parser;
//   - configurar o Swagger e o ValidationPipe global;
//   - registrar o filtro global de exceções (logs + resposta JSON);
//   - iniciar o servidor HTTP.
// ============================================================

import 'dotenv/config'; // Carrega as variáveis do arquivo .env o mais cedo possível.
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AppLoggerService } from './logger/logger.service';

async function bootstrap() {
  // Cria a aplicação NestJS. O tipo NestExpressApplication dá acesso a
  // funcionalidades específicas do Express (ex.: getHttpServer).
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Lê configurações básicas do ambiente. O prefixo global é usado em
  // todas as rotas (ex.: http://localhost:3000/template-api/usuario).
  const apiPrefix = process.env.APP_PREFIX || 'api';
  const port = Number(process.env.PORT || 3000);
  // Origens permitidas no CORS. No .env as origens são separadas por vírgula.
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://127.0.0.1:5173', 'http://localhost:5173', 'file://'];

  // Habilita Helmet para segurança
  app.use(helmet());

  // Configura CORS com opções padrão
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,x-empresa-id,x-usuario-id',
    maxAge: 86400, // Cache de 24 horas para o pré-voo
  });

  // Definindo o prefixo global para a API, sem alterar a rota raiz do AppController
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/'],
  });

  // Configurar body-parser para aumentar o limite de tamanho das requisições
  app.use(bodyParser.json({ limit: '50mb' })); // Define o limite para 50MB
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Configuração do Swagger
  // O DocumentBuilder descreve os metadados da API (título, versão, tags).
  // addBearerAuth registra o esquema de autenticação "access-token" usado
  // pelo decorator @ApiBearerAuth nos controllers protegidos.
  const config = new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription('API Template SMCT')
    .setVersion('1.0')
    .addTag('app')
    .addTag('auth')
    .addTag('usuario')
    .addTag('auditoria')
    .addTag('perfis-acesso')
    .addTag('permissoes')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();
  // Gera o documento OpenAPI e expõe a interface interativa do Swagger
  // no mesmo prefixo da API (ex.: /template-api).
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(apiPrefix, app, document);

  // Validação global de DTOs. `transform: true` permite conversão automática
  // de tipos (ex.: strings "1" para number) e aplicação dos @Transform.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Filtro global de exceções: formata a resposta de erro e registra o
  // ocorrido no logger (Winston). Precisa receber a instância do logger.
  const logger = app.get(AppLoggerService);
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Define um timeout no servidor HTTP para requisições muito longas
  // (150s). Evita que conexões fiquem abertas indefinidamente.
  const server = app.getHttpServer();
  server.setTimeout(150000); // 2.30 minutos

  // Sobe o servidor escutando apenas em localhost (127.0.0.1).
  // Para expor a API publicamente, remova o host ou configure um proxy reverso.
  await app.listen(port, '127.0.0.1');
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger is available on: http://127.0.0.1:${port}/${apiPrefix}`);
}

// Inicializa a aplicação. `void` indica que o retorno (Promise) é ignorado.
void bootstrap();
