import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('NestJS Redis Example API')
    .setDescription(
      'API documentation for @nam088/nestjs-redis example application',
    )
    .setVersion('1.0')
    .addTag('cache', 'Basic cache operations (GET, SET, DELETE)')
    .addTag('counter', 'Counter operations (INCREMENT, DECREMENT)')
    .addTag('list', 'List operations (LPUSH, LRANGE, LREM)')
    .addTag('users', 'User management with complex object storage')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

void bootstrap();
