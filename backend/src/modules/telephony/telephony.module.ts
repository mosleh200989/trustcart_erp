import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallTask } from '../crm/entities/call-task.entity';
import { User } from '../users/user.entity';
import { BracknetCallContractController, BracknetWebhookContractController } from './bracknet-contract.controller';
import { TelephonyController } from './telephony.controller';
import { TelephonyService } from './telephony.service';
import { TelephonyCall } from './entities/telephony-call.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TelephonyCall, CallTask, User])],
  controllers: [TelephonyController, BracknetCallContractController, BracknetWebhookContractController],
  providers: [TelephonyService],
  exports: [TelephonyService],
})
export class TelephonyModule {}
