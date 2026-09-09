import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Avatars (and any other multer upload) land in ./uploads/<folder>; serve
  // that same tree back out so the stored avatarUrl actually resolves.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // The refresh token lives in an httpOnly cookie; without this the refresh
  // strategy can never read it.
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // drop properties with no DTO rule...
      forbidNonWhitelisted: true, // ...and reject the request that sent them
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: process.env.CLIENT_ORIGIN?.split(',') ?? true,
    credentials: true,
  });

  // Expo Go runs on another device, so accept connections on the LAN interface.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
