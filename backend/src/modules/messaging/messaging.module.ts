import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [CustomersModule, LoyaltyModule],
  providers: [WhatsAppService, SmsService],
  exports: [WhatsAppService, SmsService],
})
export class MessagingModule {}
