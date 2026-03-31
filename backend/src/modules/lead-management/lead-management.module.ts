import { Module, forwardRef } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { LeadManagementService } from './lead-management.service';
import { LeadManagementController } from './lead-management.controller';
import { SalesModule } from '../sales/sales.module';
import { CustomerSession } from './entities/customer-session.entity';
import { IncompleteOrder } from './entities/incomplete-order.entity';
import { TeamAssignment } from './entities/team-assignment.entity';
import { TeamAData } from './entities/team-a-data.entity';
import { TeamBData } from './entities/team-b-data.entity';
import { TeamCData } from './entities/team-c-data.entity';
import { TeamDData } from './entities/team-d-data.entity';
import { TeamEData } from './entities/team-e-data.entity';
import { CustomerTier } from './entities/customer-tier.entity';

@Module({
  imports: [
    TenantTypeOrmModule.forFeature([
      CustomerSession,
      IncompleteOrder,
      TeamAssignment,
      TeamAData,
      TeamBData,
      TeamCData,
      TeamDData,
      TeamEData,
      CustomerTier,
    ]),
    forwardRef(() => SalesModule),
  ],
  controllers: [LeadManagementController],
  providers: [LeadManagementService],
  exports: [LeadManagementService],
})
export class LeadManagementModule {}
