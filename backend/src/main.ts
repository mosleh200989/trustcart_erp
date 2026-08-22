process.env.TZ = process.env.TZ || 'Asia/Dhaka';

import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { buildAllowedOrigins, isOriginAllowed } from './common/cors-origin';
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

  // Security headers.
  //
  // Two defaults are overridden deliberately:
  //
  //  - contentSecurityPolicy is off. This process serves JSON and the Swagger
  //    UI, nothing else. Helmet's default CSP breaks Swagger's inline scripts,
  //    and a CSP for the storefront belongs on the Next.js side where the HTML
  //    is actually rendered.
  //
  //  - crossOriginResourcePolicy is relaxed to cross-origin because /uploads
  //    is served from this process and loaded by the storefronts, which are on
  //    different origins. Helmet's same-origin default would blank every
  //    product image.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

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

  // CORS
  // When running behind nginx in production, you may disable this
  // and let nginx handle CORS instead.
  const allowedOrigins = buildAllowedOrigins(process.env.FRONTEND_URL);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowAny = process.env.NODE_ENV === 'development';
      callback(null, isOriginAllowed(origin, allowedOrigins, { allowAny }));
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
