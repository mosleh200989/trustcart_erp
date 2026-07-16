import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { User } from '../users/user.entity';
import { UserPresenceEvent } from './entities/user-presence-event.entity';
import { UserPresenceStatus } from './entities/user-presence-status.entity';
import { PresenceSettings } from './entities/presence-settings.entity';
import { UserOfficeTime } from './entities/user-office-time.entity';
import { PresenceCalendarOverride } from './entities/presence-calendar-override.entity';
import { PresenceCalendarOverrideHistory } from './entities/presence-calendar-override-history.entity';
import { PresenceUserProfile } from './entities/presence-user-profile.entity';
import { BackupTeamOfficeTime } from './entities/backup-team-office-time.entity';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { PresenceStaleStatusService } from './presence-stale-status.service';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    TenantTypeOrmModule.forFeature([
      UserPresenceStatus,
      UserPresenceEvent,
      PresenceSettings,
      UserOfficeTime,
      PresenceCalendarOverride,
      PresenceCalendarOverrideHistory,
      PresenceUserProfile,
      BackupTeamOfficeTime,
      User,
    ]),
    SalesModule,
  ],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceStaleStatusService],
  exports: [PresenceService],
})
export class PresenceModule {}
