import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [CustomersModule, LoyaltyModule],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class MessagingModule {}
