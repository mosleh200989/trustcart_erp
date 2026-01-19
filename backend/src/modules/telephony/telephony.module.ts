import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallTask } from '../crm/entities/call-task.entity';
import { User } from '../users/user.entity';
import { BracknetCallContractController, BracknetWebhookContractController } from './bracknet-contract.controller';
import { TelephonyController } from './telephony.controller';
import { TelephonyService } from './telephony.service';
import { TelephonyCall } from './entities/telephony-call.entity';
import { TelephonyAgentPresenceEvent } from './entities/telephony-agent-presence-event.entity';
import { CustomersModule } from '../customers/customers.module';
import { TelephonyGateway } from './telephony.gateway';
import { TelephonyPresenceService } from './telephony-presence.service';
import { Activity } from '../crm/entities/activity.entity';
import { TelephonyReportsService } from './telephony-reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelephonyCall, TelephonyAgentPresenceEvent, CallTask, User, Activity]), CustomersModule],
  controllers: [TelephonyController, BracknetCallContractController, BracknetWebhookContractController],
  providers: [TelephonyService, TelephonyReportsService, TelephonyGateway, TelephonyPresenceService],
  exports: [TelephonyService, TelephonyPresenceService],
})
export class TelephonyModule {}
