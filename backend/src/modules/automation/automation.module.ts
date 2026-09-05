import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AUTOMATION_ENTITIES } from './entities';

import { Product } from '../products/product.entity';
import { SalesOrder } from '../sales/sales-order.entity';
import { StorefrontProduct } from '../storefronts/storefront-product.entity';
import { Storefront } from '../storefronts/storefront.entity';
import { Customer } from '../customers/customer.entity';
import { SupportTicket } from '../support/support-ticket.entity';
import { SalesModule } from '../sales/sales.module';

import { AutomationSettingsService } from './automation-settings.service';
import { AutomationAuditService } from './automation-audit.service';
import { AutomationGateService } from './automation-gate.service';
import { AutomationGateGuard } from './automation-gate.guard';
import { AutomationErpService } from './automation-erp.service';
import { AutomationAiService } from './automation-ai.service';
import { AutomationFaqService } from './automation-faq.service';
import { AutomationOrderService } from './automation-order.service';
import { AutomationHealthService } from './automation-health.service';
import { AutomationService } from './automation.service';

import { FacebookApiService } from './facebook/facebook-api.service';
import { ReplyBrainService } from './facebook/reply-brain.service';
import { FacebookOutboxService } from './facebook/facebook-outbox.service';
import { FacebookEventService } from './facebook/facebook-event.service';
import { HistoryImportService } from './history/history-import.service';
import { HistoryCurationService } from './history/history-curation.service';

import { AutomationController } from './automation.controller';
import { AutomationGateController } from './automation-gate.controller';
import { FacebookWebhookController } from './facebook/facebook-webhook.controller';
import { MetaWebhookGuard } from '../../common/guards/meta-webhook.guard';

/**
 * Facebook / Instagram comment and Messenger automation.
 *
 * Runs inside the existing NestJS process — no extra server, no queue workers,
 * no separate database. Retries and pruning ride on `@nestjs/schedule`, which is
 * already registered globally in AppModule.
 *
 * Read-only entities (Product, SalesOrder, Customer, Storefront) are registered
 * here so the reply brain can ground answers in real shop data over localhost
 * rather than an HTTP hop.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ...AUTOMATION_ENTITIES,
      // Read-only, for grounding replies and escalating to support.
      Product,
      SalesOrder,
      StorefrontProduct,
      Storefront,
      Customer,
      SupportTicket,
    ]),
    // Messenger orders go through SalesService, so a bot order is
    // indistinguishable downstream from a website one.
    SalesModule,
  ],
  controllers: [AutomationController, AutomationGateController, FacebookWebhookController],
  providers: [
    AutomationSettingsService,
    AutomationAuditService,
    AutomationGateService,
    AutomationGateGuard,
    AutomationErpService,
    AutomationAiService,
    AutomationFaqService,
    AutomationOrderService,
    AutomationHealthService,
    AutomationService,
    FacebookApiService,
    ReplyBrainService,
    FacebookOutboxService,
    FacebookEventService,
    HistoryImportService,
    HistoryCurationService,
    MetaWebhookGuard,
  ],
  exports: [AutomationSettingsService, TypeOrmModule],
})
export class AutomationModule {}
