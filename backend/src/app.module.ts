import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Product } from './modules/products/product.entity';
import { User } from './modules/users/user.entity';
import { Customer } from './modules/customers/customer.entity';
import { BlogPost } from './modules/blog/blog-post.entity';
import { BlogCategory } from './modules/blog/blog-category.entity';
import { BlogTag } from './modules/blog/blog-tag.entity';
import { ComboDeal } from './modules/combos/combo-deal.entity';
import { CustomerReview } from './modules/reviews/customer-review.entity';
import { EmailSubscriber } from './modules/subscribers/email-subscriber.entity';
import { UserProductView } from './modules/product-views/user-product-view.entity';
import { Role } from './modules/rbac/role.entity';
import { Permission } from './modules/rbac/permission.entity';
import { JobPost } from './modules/recruitment/entities/job-post.entity';
import { JobApplication } from './modules/recruitment/entities/job-application.entity';
import { Interview } from './modules/recruitment/entities/interview.entity';
import { FamilyMember } from './modules/customers/entities/family-member.entity';
import { CustomerInteraction } from './modules/customers/entities/customer-interaction.entity';
import { CustomerBehavior } from './modules/customers/entities/customer-behavior.entity';
import { CustomerDropoff } from './modules/customers/entities/customer-dropoff.entity';
import { CustomerAddress } from './modules/customers/entities/customer-address.entity';
import { CallTask } from './modules/crm/entities/call-task.entity';
import { RecommendationRule } from './modules/crm/entities/recommendation-rule.entity';
import { EngagementHistory } from './modules/crm/entities/engagement-history.entity';
import { MarketingCampaign } from './modules/crm/entities/marketing-campaign.entity';
import { SalesTeam } from './modules/crm/entities/sales-team.entity';
import { SalesOrder } from './modules/sales/sales-order.entity';
import { SalesOrderItem } from './modules/sales/sales-order-item.entity';
import { OrderItem } from './modules/sales/entities/order-item.entity';
import { OrderActivityLog } from './modules/sales/entities/order-activity-log.entity';
import { CourierTrackingHistory } from './modules/sales/entities/courier-tracking-history.entity';
import { SupportTicket } from './modules/support/support-ticket.entity';
import { Offer } from './modules/offers/entities/offer.entity';
import { OfferCondition } from './modules/offers/entities/offer-condition.entity';
import { OfferReward } from './modules/offers/entities/offer-reward.entity';
import { OfferProduct } from './modules/offers/entities/offer-product.entity';
import { OfferCategory } from './modules/offers/entities/offer-category.entity';
import { OfferUsage } from './modules/offers/entities/offer-usage.entity';
import { Banner } from './modules/banners/banner.entity';
import { Category } from './modules/categories/category.entity';
import { SpecialOffer } from './modules/special-offers/special-offer.entity';
import { DealOfTheDay } from './modules/products/deal-of-the-day.entity';

// Loyalty Entities
import { CustomerMembership } from './modules/loyalty/entities/customer-membership.entity';
import { CustomerWallet } from './modules/loyalty/entities/customer-wallet.entity';
import { WalletTransaction } from './modules/loyalty/entities/wallet-transaction.entity';
import { CustomerReferral } from './modules/loyalty/entities/customer-referral.entity';
import { MonthlyGroceryList } from './modules/loyalty/entities/monthly-grocery-list.entity';
import { GroceryListItem } from './modules/loyalty/entities/grocery-list-item.entity';
import { PriceLock } from './modules/loyalty/entities/price-lock.entity';

// CRM Entities
import { Deal } from './modules/crm/entities/deal.entity';
import { DealStage } from './modules/crm/entities/deal-stage.entity';
import { Activity } from './modules/crm/entities/activity.entity';
import { Task } from './modules/crm/entities/task.entity';
import { Quote } from './modules/crm/entities/quote.entity';
import { Meeting } from './modules/crm/entities/meeting.entity';
import { EmailTracking } from './modules/crm/entities/email-tracking.entity';
import { CustomDealStage } from './modules/crm/entities/custom-deal-stage.entity';
import { SalesPipeline } from './modules/crm/entities/sales-pipeline.entity';
import { ActivityTemplate } from './modules/crm/entities/activity-template.entity';
import { CustomerSegment } from './modules/crm/entities/customer-segment.entity';
import { SegmentMember } from './modules/crm/entities/segment-member.entity';
import { EmailTemplate } from './modules/crm/entities/email-template.entity';
import { AutomationWorkflow } from './modules/crm/entities/automation-workflow.entity';
import { WorkflowExecution } from './modules/crm/entities/workflow-execution.entity';
import { QuoteTemplate } from './modules/crm/entities/quote-template.entity';
import { SalesForecast } from './modules/crm/entities/sales-forecast.entity';
import { SalesQuota } from './modules/crm/entities/sales-quota.entity';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { BlogModule } from './modules/blog/blog.module';
import { CombosModule } from './modules/combos/combos.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SubscribersModule } from './modules/subscribers/subscribers.module';
import { ProductViewsModule } from './modules/product-views/product-views.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { HrmModule } from './modules/hrm/hrm.module';
// HRM Entities
import { HrmBranches } from './modules/hrm/entities/hrm-branches.entity';
import { HrmDepartments } from './modules/hrm/entities/hrm-departments.entity';
import { HrmDesignations } from './modules/hrm/entities/hrm-designations.entity';
import { HrmEmployees } from './modules/hrm/entities/hrm-employees.entity';
import { HrmAwardTypes } from './modules/hrm/entities/hrm-award-types.entity';
import { HrmAwards } from './modules/hrm/entities/hrm-awards.entity';
import { HrmPromotions } from './modules/hrm/entities/hrm-promotions.entity';
import { HrmResignations } from './modules/hrm/entities/hrm-resignations.entity';
import { HrmTerminations } from './modules/hrm/entities/hrm-terminations.entity';
import { HrmWarnings } from './modules/hrm/entities/hrm-warnings.entity';
import { HrmTrips } from './modules/hrm/entities/hrm-trips.entity';
import { HrmComplaints } from './modules/hrm/entities/hrm-complaints.entity';
import { HrmTransfers } from './modules/hrm/entities/hrm-transfers.entity';
import { HrmHolidays } from './modules/hrm/entities/hrm-holidays.entity';
import { HrmAnnouncements } from './modules/hrm/entities/hrm-announcements.entity';
import { HrmTrainingTypes } from './modules/hrm/entities/hrm-training-types.entity';
import { HrmTrainingPrograms } from './modules/hrm/entities/hrm-training-programs.entity';
import { HrmTrainingSessions } from './modules/hrm/entities/hrm-training-sessions.entity';
import { HrmEmployeeTrainings } from './modules/hrm/entities/hrm-employee-trainings.entity';
import { HrmPerformanceIndicatorCategories } from './modules/hrm/entities/hrm-performance-indicator-categories.entity';
import { HrmPerformanceIndicators } from './modules/hrm/entities/hrm-performance-indicators.entity';
import { HrmEmployeePerformance } from './modules/hrm/entities/hrm-employee-performance.entity';
import { HrmDocumentTypes } from './modules/hrm/entities/hrm-document-types.entity';
import { HrmEmployeeDocuments } from './modules/hrm/entities/hrm-employee-documents.entity';
import { PayrollModule } from './modules/payroll/payroll.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { CrmModule } from './modules/crm/crm.module';
import { SupportModule } from './modules/support/support.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { OffersModule } from './modules/offers/offers.module';
import { LeadManagementModule } from './modules/lead-management/lead-management.module';
import { BannersModule } from './modules/banners/banners.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { UploadModule } from './modules/upload/upload.module';
import { SpecialOffersModule } from './modules/special-offers/special-offers.module';

@Module({
  imports: [
    // Config Module - must be first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database Module
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST') || '127.0.0.1',
          port: parseInt(configService.get<string>('DB_PORT') || '5432', 10),
          username: configService.get<string>('DB_USER') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') || 'c0mm0n',
          database: configService.get<string>('DB_NAME') || 'trustcart_erp',
          entities: [
            Product, User, Customer, BlogPost, BlogCategory, BlogTag, ComboDeal, 
            CustomerReview, EmailSubscriber, UserProductView, Role, Permission, 
            JobPost, JobApplication, Interview,
            FamilyMember, CustomerInteraction, CustomerBehavior, CustomerDropoff, CustomerAddress,
            CallTask, RecommendationRule, EngagementHistory, MarketingCampaign,
            SalesTeam, SalesOrder, SalesOrderItem, OrderItem, OrderActivityLog, CourierTrackingHistory, SupportTicket,

            Offer, OfferCondition, OfferReward, OfferProduct, OfferCategory, OfferUsage, Banner, Category, SpecialOffer,
            
            
            DealOfTheDay,
            // Loyalty entities
            CustomerMembership, CustomerWallet, WalletTransaction, CustomerReferral, MonthlyGroceryList, GroceryListItem, PriceLock,
            // CRM entities
            Deal, DealStage, Activity, Task, Quote, Meeting, EmailTracking,
            CustomDealStage, SalesPipeline, ActivityTemplate, CustomerSegment, SegmentMember,
            EmailTemplate, AutomationWorkflow, WorkflowExecution, QuoteTemplate, SalesForecast, SalesQuota,
            // HRM Entities
            HrmBranches, HrmDepartments, HrmDesignations, HrmEmployees, HrmAwardTypes, HrmAwards, HrmPromotions, HrmResignations, HrmTerminations, HrmWarnings, HrmTrips, HrmComplaints, HrmTransfers, HrmHolidays, HrmAnnouncements, HrmTrainingTypes, HrmTrainingPrograms, HrmTrainingSessions, HrmEmployeeTrainings, HrmPerformanceIndicatorCategories, HrmPerformanceIndicators, HrmEmployeePerformance, HrmDocumentTypes, HrmEmployeeDocuments
          ],
          synchronize: false,
          logging: true,
        };
        
        console.log('=== Database Configuration ===');
        console.log('Host:', dbConfig.host);
        console.log('Port:', dbConfig.port);
        console.log('Database:', dbConfig.database);
        console.log('Username:', dbConfig.username);
        console.log('Entities:', dbConfig.entities.length);
        
        return dbConfig;
      },
    }),

    // Feature Modules
    AuthModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    BlogModule,
    CombosModule,
    ReviewsModule,
    SubscribersModule,
    ProductViewsModule,
    RbacModule,
    RecruitmentModule,
    SalesModule,
    PurchaseModule,
    InventoryModule,
    HrmModule,
    PayrollModule,
    AccountingModule,
    ProjectModule,
    TaskModule,
    CrmModule,
    SupportModule,
    LoyaltyModule,
    OffersModule,
    LeadManagementModule,
    BannersModule,
    CategoriesModule,
    UploadModule,
    SpecialOffersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
