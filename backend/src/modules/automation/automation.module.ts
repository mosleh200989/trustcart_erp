import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AutomationSetting } from './entities/automation-setting.entity';
import { AutomationChannel } from './entities/automation-channel.entity';
import { AutomationEvent } from './entities/automation-event.entity';
import { AutomationConversation } from './entities/automation-conversation.entity';
import { AutomationMessage } from './entities/automation-message.entity';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationOutbox } from './entities/automation-outbox.entity';
import { AutomationAudit } from './entities/automation-audit.entity';

import { Product } from '../products/product.entity';
import { SalesOrder } from '../sales/sales-order.entity';
import { StorefrontProduct } from '../storefronts/storefront-product.entity';
import { Storefront } from '../storefronts/storefront.entity';
import { Customer } from '../customers/customer.entity';
import { SupportTicket } from '../support/support-ticket.entity';

import { AutomationSettingsService } from './automation-settings.service';
import { AutomationAuditService } from './automation-audit.service';
import { AutomationGateService } from './automation-gate.service';
import { AutomationGateGuard } from './automation-gate.guard';
import { AutomationErpService } from './automation-erp.service';
import { AutomationAiService } from './automation-ai.service';
import { AutomationService } from './automation.service';

import { FacebookApiService } from './facebook/facebook-api.service';
import { ReplyBrainService } from './facebook/reply-brain.service';
import { FacebookOutboxService } from './facebook/facebook-outbox.service';
import { FacebookEventService } from './facebook/facebook-event.service';

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
      AutomationSetting,
      AutomationChannel,
      AutomationEvent,
      AutomationConversation,
      AutomationMessage,
      AutomationRule,
      AutomationOutbox,
      AutomationAudit,
      // Read-only, for grounding replies and escalating to support.
      Product,
      SalesOrder,
      StorefrontProduct,
      Storefront,
      Customer,
      SupportTicket,
    ]),
  ],
  controllers: [AutomationController, AutomationGateController, FacebookWebhookController],
  providers: [
    AutomationSettingsService,
    AutomationAuditService,
    AutomationGateService,
    AutomationGateGuard,
    AutomationErpService,
    AutomationAiService,
    AutomationService,
    FacebookApiService,
    ReplyBrainService,
    FacebookOutboxService,
    FacebookEventService,
    MetaWebhookGuard,
  ],
  exports: [AutomationSettingsService, TypeOrmModule],
})
export class AutomationModule {}
