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
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CrmReferralsController } from './crm-referrals.controller';
import { CrmReferralsService } from './crm-referrals.service';
import { DealStageService } from './deal-stage.service';
import { DealStageController } from './deal-stage.controller';
// Phase 1 Services and Controllers
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { SegmentationService } from './segmentation.service';
import { SegmentationController } from './segmentation.controller';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplateController } from './email-template.controller';
import { ActivityTemplateService } from './activity-template.service';
import { ActivityTemplateController } from './activity-template.controller';
import { ForecastService } from './forecast.service';
import { ForecastController } from './forecast.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { QuoteTemplateService } from './quote-template.service';
import { QuoteTemplateController } from './quote-template.controller';
// Entities
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
// Phase 1 Entities
import { CustomDealStage } from './entities/custom-deal-stage.entity';
import { SalesPipeline } from './entities/sales-pipeline.entity';
import { ActivityTemplate } from './entities/activity-template.entity';
import { CustomerSegment } from './entities/customer-segment.entity';
import { SegmentMember } from './entities/segment-member.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { AutomationWorkflow } from './entities/automation-workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { QuoteTemplate } from './entities/quote-template.entity';
import { SalesForecast } from './entities/sales-forecast.entity';
import { SalesQuota } from './entities/sales-quota.entity';
import { RbacModule } from '../rbac/rbac.module';
import { CrmAnalyticsController } from './crm-analytics.controller';
import { CrmAnalyticsService } from './crm-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Existing entities
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
      EmailTracking,
      // Phase 1 entities
      CustomDealStage,
      SalesPipeline,
      ActivityTemplate,
      CustomerSegment,
      SegmentMember,
      EmailTemplate,
      AutomationWorkflow,
      WorkflowExecution,
      QuoteTemplate,
      SalesForecast,
      SalesQuota
    ]),
    RbacModule,
    LoyaltyModule,
  ],
  controllers: [
    // Existing controllers
    CrmController,
    CrmTeamController, 
    CrmAutomationController,
    DealController,
    DealStageController,
    ActivityController,
    TaskController,
    QuoteController,
    MeetingController,
    EmailTrackingController,
    CommunicationsController,
    // Phase 1 controllers
    PipelineController,
    SegmentationController,
    EmailTemplateController,
    CrmReferralsController,
    ActivityTemplateController,
    ForecastController,
    WorkflowController,
    QuoteTemplateController,
    CrmAnalyticsController
  ],
  providers: [
    // Existing providers
    CrmService, 
    CrmTeamService, 
    CrmAutomationService,
    DealService,
    DealStageService,
    ActivityService,
    TaskService,
    QuoteService,
    MeetingService,
    EmailTrackingService,
    CommunicationsService,
    // Phase 1 providers
    PipelineService,
    SegmentationService,
    EmailTemplateService,
    ActivityTemplateService,
    CrmReferralsService,
    ForecastService,
    WorkflowService,
    QuoteTemplateService,
    CrmAnalyticsService
  ],
  exports: [
    // Existing exports
    CrmService, 
    CrmTeamService, 
    CrmAutomationService,
    DealService,
    DealStageService,
    ActivityService,
    TaskService,
    QuoteService,
    MeetingService,
    EmailTrackingService,
    CommunicationsService,
    // Phase 1 exports
    PipelineService,
    SegmentationService,
    EmailTemplateService,
    ActivityTemplateService,
    ForecastService,
    WorkflowService,
    QuoteTemplateService,
    CrmAnalyticsService
  ],
})
export class CrmModule {}
