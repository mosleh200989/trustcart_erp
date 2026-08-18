process.env.TZ = process.env.TZ || 'Asia/Dhaka';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AuditInterceptor } from './modules/audit-log/audit.interceptor';
import { AuditLogService } from './modules/audit-log/audit-log.service';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.set('trust proxy', true);
  const port = process.env.PORT || 3001;

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Serve uploads directory as static assets
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  // Register global audit interceptor
  const auditLogService = app.get(AuditLogService);
  app.useGlobalInterceptors(new AuditInterceptor(auditLogService));

  // CORS allowed origins — all domains served by this backend
  const APP_DOMAINS = [
    'trustcart.com.bd',
    'shop.trustcart.com.bd',
    'trustkert.com',
    'api.trustkert.com',
    'herbolin.com',
    'api.herbolin.com',
    'arabiankhalta.com',
    'veshoj.site',
    'api.veshoj.site',
    'kasrioil.com',
  ];
  const allowedOrigins = new Set<string>([
    'http://localhost:3000', // local frontend dev
    'http://localhost:3001', // local backend dev
  ]);
  for (const domain of APP_DOMAINS) {
    allowedOrigins.add(`https://${domain}`);
    // Add www. variant only if domain doesn't already start with www./api.
    if (!domain.startsWith('www.') && !domain.startsWith('api.')) {
      allowedOrigins.add(`https://www.${domain}`);
    }
  }
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    allowedOrigins.add(frontendUrl);
  }
  const originsArray = [...allowedOrigins];

  // CORS
  // When running behind nginx in production, you may disable this
  // and let nginx handle CORS instead.
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (Postman, server-to-server, etc.)
      if (!origin) return callback(null, true);
      if (originsArray.some((o) => origin === o || origin.startsWith(o))) {
        return callback(null, true);
      }
      // In development, allow all origins
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
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
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TrustCart ERP API')
    .setDescription('Backend API for TrustCart (Organic Grocery)')
    .setVersion('2.0.0')
    .addBearerAuth()
    .addBasicAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  
  console.log(`
    ╔════════════════════════════════════════════╗
    ║   🚀 TrustCart ERP Backend Started       ║
    ╠════════════════════════════════════════════╣
    ║   Server:  http://localhost:${port}
    ║   API Docs: http://localhost:${port}/api/docs
    ╚════════════════════════════════════════════╝
    `);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
