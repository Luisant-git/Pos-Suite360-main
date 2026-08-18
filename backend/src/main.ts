import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors(); // Allow frontend to communicate with backend
  
  // Increase payload limit to 50mb to allow for large Base64 PDF attachments
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();