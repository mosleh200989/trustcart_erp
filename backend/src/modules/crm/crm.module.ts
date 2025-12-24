import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { CrmTeamService } from './crm-team.service';
import { CrmTeamController } from './crm-team.controller';
import { CrmAutomationService } from './crm-automation.service';
import { CrmAutomationController } from './crm-automation.controller';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { CallTask } from './entities/call-task.entity';
import { EngagementHistory } from './entities/engagement-history.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { MarketingCampaign } from './entities/marketing-campaign.entity';
import { SalesTeam } from './entities/sales-team.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      User,
      CallTask,
      EngagementHistory,
      RecommendationRule,
      MarketingCampaign,
      SalesTeam
    ]),
    RbacModule
  ],
  controllers: [CrmController, CrmTeamController, CrmAutomationController],
  providers: [CrmService, CrmTeamService, CrmAutomationService],
  exports: [CrmService, CrmTeamService, CrmAutomationService],
})
export class CrmModule {}
