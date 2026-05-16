import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { User } from '../users/user.entity';
import { UserPresenceEvent } from './entities/user-presence-event.entity';
import { UserPresenceStatus } from './entities/user-presence-status.entity';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';

@Module({
  imports: [TenantTypeOrmModule.forFeature([UserPresenceStatus, UserPresenceEvent, User])],
  controllers: [PresenceController],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
