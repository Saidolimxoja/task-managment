import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'Task-Management',
    }),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const configs = app.get(ConfigService);

  const port = configs.getOrThrow<number>('PORT');



  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription('API для системы управления задачами с ролевой моделью')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Аутентификация и авторизация')
    .addTag('Users', 'Управление пользователями')
    .addTag('Projects', 'Управление проектами')
    .addTag('Tasks', 'Управление задачами')
    .addTag('Comments', 'Комментарии к задачам')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);


  try {
    await app.listen(4200);

    Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
    Logger.log(`👌✅Program successfully run on http://localhost:${port}`);
  } catch (error) {
    Logger.log(
      `❌ Program not run successfully on http://localhost:${port}`,
      error,
    );
    process.exit(1);
  }
}

bootstrap();
