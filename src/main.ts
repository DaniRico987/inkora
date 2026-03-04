import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global
  app.setGlobalPrefix('api/v1');

  // Validaci√≥n global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('INKORA API')
    .setDescription('API REST para la plataforma de librer√≠a INKORA')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Auth', 'Autenticaci√≥n y autorizaci√≥n')
    .addTag('Users', 'Gesti√≥n de usuarios')
    .addTag('Books', 'Cat√°logo de libros')
    .addTag('Categories', 'Categor√≠as literarias')
    .addTag('Stores', 'Tiendas f√≠sicas')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\nÌ∫Ä INKORA API corriendo en: http://localhost:${port}`);
  console.log(`Ì≥Ñ Swagger docs en:         http://localhost:${port}/api/docs\n`);
}

bootstrap();
