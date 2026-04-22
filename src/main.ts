import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global
  app.setGlobalPrefix('api/v1');

  // Validación global
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
    .setDescription(
      'Documentación oficial de la API REST para la plataforma de librería INKORA. ' +
      'Esta API permite gestionar el catálogo de libros, usuarios, categorías y tiendas físicas.',
    )
    .setVersion('1.0')
    .setContact(
      'INKORA Support',
      'https://inkora.com/support',
      'support@inkora.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el token JWT obtenido al iniciar sesión',
      },
      'JWT',
    )
    .addTag('Auth', 'Operaciones de autenticación, registro y recuperación de cuenta')
    .addTag('Users', 'Gestión de perfiles de usuario y preferencias')
    .addTag('Books', 'Catálogo completo de libros, búsqueda y filtrado')
    .addTag('Categories', 'Organización de libros por géneros y categorías')
    .addTag('Stores', 'Información sobre sucursales y puntos de venta físicos')
    .addTag('Purchases', 'Flujo de compras, seguimiento y actualización de estados')
    .addTag(
      'Reservations',
      'Reservas de libros con expiración automática de 24 horas',
    )
    .addTag(
      'Administradores',
      'Gestión de administradores (solo accesible para usuarios root)',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n��� INKORA API corriendo en: http://localhost:${port}`);
  console.log(`��� Swagger docs en:         http://localhost:${port}/api/docs\n`);
}

bootstrap();
