import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3001;

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS with Private Network Access support
  app.enableCors({
    origin: [
      'https://trustkert.com',
      'https://www.trustkert.com',
      'https://trustcart.com.bd',
      'https://www.trustcart.com.bd',
      'http://localhost:3000',
      ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
    ],
    credentials: true,
    // methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Handle Private Network Access preflight (Chrome's local network access prompt)
  app.use((req: any, res: any, next: any) => {
    // Respond to Private Network Access preflight requests
    if (req.headers['access-control-request-private-network']) {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  });

  // Set response headers for UTF-8 encoding
  app.use((req: any, res: any, next: any) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('TrustCart ERP API')
    .setDescription('Complete ERP System for Organic Grocery Business')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addBasicAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  
  console.log(`
    ╔════════════════════════════════════════╗
    ║   🚀 TrustCart ERP Backend Started    ║
    ╠════════════════════════════════════════╣
    ║   Server running on: http://localhost:${port}
    ║   API Docs: http://localhost:${port}/api/docs
    ╚════════════════════════════════════════╝
    `);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
