import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { CrmTeamService } from './crm-team.service';
import { CrmTeamController } from './crm-team.controller';
import { CrmAutomationService } from './crm-automation.service';
import { CrmAutomationController } from './crm-automation.controller';
import { DealService } from './deal.service';
import { DealController } from './deal.controller';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { MeetingService } from './meeting.service';
import { MeetingController } from './meeting.controller';
import { EmailTrackingService } from './email-tracking.service';
import { EmailTrackingController } from './email-tracking.controller';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { CallTask } from './entities/call-task.entity';
import { EngagementHistory } from './entities/engagement-history.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { MarketingCampaign } from './entities/marketing-campaign.entity';
import { SalesTeam } from './entities/sales-team.entity';
import { Deal } from './entities/deal.entity';
import { Activity } from './entities/activity.entity';
import { Task } from './entities/task.entity';
import { Quote } from './entities/quote.entity';
import { Meeting } from './entities/meeting.entity';
import { EmailTracking } from './entities/email-tracking.entity';
import { DealStage } from './entities/deal-stage.entity';
import { DealStageService } from './deal-stage.service';
import { DealStageController } from './deal-stage.controller';
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
      SalesTeam,
      Deal,
      DealStage,
      Activity,
      Task,
      Quote,
      Meeting,
      EmailTracking
    ]),
    RbacModule
  ],
  controllers: [
    CrmController, 
    CrmTeamController, 
    CrmAutomationController,
    DealController,
    DealStageController,
    ActivityController,
    TaskController,
    QuoteController,
    MeetingController,
    EmailTrackingController
  ],
  providers: [
    CrmService, 
    CrmTeamService, 
    CrmAutomationService,
    DealService,
    DealStageService,
    ActivityService,
    TaskService,
    QuoteService,
    MeetingService,
    EmailTrackingService
  ],
  exports: [
    CrmService, 
    CrmTeamService, 
    CrmAutomationService,
    DealService,
    DealStageService,
    ActivityService,
    TaskService,
    QuoteService,
    MeetingService,
    EmailTrackingService
  ],
})
export class CrmModule {}
