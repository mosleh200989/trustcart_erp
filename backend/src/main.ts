import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AuditInterceptor } from './modules/audit-log/audit.interceptor';
import { AuditLogService } from './modules/audit-log/audit-log.service';
import { TenantService } from './modules/tenant/tenant.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3001;

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Register global audit interceptor
  const auditLogService = app.get(AuditLogService);
  app.useGlobalInterceptors(new AuditInterceptor(auditLogService));

  // Build CORS allowed origins from all tenant domains
  const tenantService = app.get(TenantService);
  const allowedOrigins = new Set<string>();
  for (const tenant of tenantService.getAllTenants()) {
    for (const domain of tenant.domains) {
      if (domain.startsWith('localhost')) {
        allowedOrigins.add(`http://${domain}`);
      } else {
        allowedOrigins.add(`https://${domain}`);
        // Add www. variant only if domain doesn't already start with www./api.
        if (!domain.startsWith('www.') && !domain.startsWith('api.')) {
          allowedOrigins.add(`https://www.${domain}`);
        }
      }
    }
    if (tenant.frontendUrl) {
      allowedOrigins.add(tenant.frontendUrl);
    }
  }
  const originsArray = [...allowedOrigins];

  // CORS — automatically derived from tenant domains
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-tenant-id'],
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
    .setTitle('TrustCart / Natural Glowra Multi-Tenant ERP API')
    .setDescription('Shared backend for TrustCart (Organic Grocery) and Natural Glowra (Cosmetics)')
    .setVersion('2.0.0')
    .addBearerAuth()
    .addBasicAuth()
    .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  
  const tenants = tenantService.getAllTenants().map((t) => t.id).join(', ');
  console.log(`
    ╔══════════════════════════════════════════════╗
    ║   🚀 Multi-Tenant ERP Backend Started       ║
    ╠══════════════════════════════════════════════╣
    ║   Server:  http://localhost:${port}
    ║   API Docs: http://localhost:${port}/api/docs
    ║   Tenants: ${tenants}
    ╚══════════════════════════════════════════════╝
    `);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
