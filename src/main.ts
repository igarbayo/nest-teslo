import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api'); // Set a global prefix for all routes

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Automatically strip properties that do not have any decorators    
      forbidNonWhitelisted: true,
    }) // Throw an error if non-whitelisted properties are found
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
