import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { HrmBranches } from './entities/hrm-branches.entity';
import { HrmDepartments } from './entities/hrm-departments.entity';
import { HrmDesignations } from './entities/hrm-designations.entity';
import { HrmEmployees } from './entities/hrm-employees.entity';
import { HrmAwardTypes } from './entities/hrm-award-types.entity';
import { HrmAwards } from './entities/hrm-awards.entity';
import { HrmPromotions } from './entities/hrm-promotions.entity';
import { HrmResignations } from './entities/hrm-resignations.entity';
import { HrmTerminations } from './entities/hrm-terminations.entity';
import { HrmWarnings } from './entities/hrm-warnings.entity';
import { HrmTrips } from './entities/hrm-trips.entity';
import { HrmComplaints } from './entities/hrm-complaints.entity';
import { HrmTransfers } from './entities/hrm-transfers.entity';
import { HrmHolidays } from './entities/hrm-holidays.entity';
import { HrmAnnouncements } from './entities/hrm-announcements.entity';
import { HrmTrainingTypes } from './entities/hrm-training-types.entity';
import { HrmTrainingPrograms } from './entities/hrm-training-programs.entity';
import { HrmTrainingSessions } from './entities/hrm-training-sessions.entity';
import { HrmEmployeeTrainings } from './entities/hrm-employee-trainings.entity';
import { HrmPerformanceIndicatorCategories } from './entities/hrm-performance-indicator-categories.entity';
import { HrmPerformanceIndicators } from './entities/hrm-performance-indicators.entity';
import { HrmEmployeePerformance } from './entities/hrm-employee-performance.entity';
import { HrmDocumentTypes } from './entities/hrm-document-types.entity';
import { HrmEmployeeDocuments } from './entities/hrm-employee-documents.entity';

// Services
import { HrmBranchesService } from './services/hrm-branches.service';
import { HrmDepartmentsService } from './services/hrm-departments.service';
import { HrmDesignationsService } from './services/hrm-designations.service';
import { HrmEmployeesService } from './services/hrm-employees.service';
import { HrmAwardTypesService } from './services/hrm-award-types.service';
import { HrmAwardsService } from './services/hrm-awards.service';
import { HrmPromotionsService } from './services/hrm-promotions.service';
import { HrmResignationsService } from './services/hrm-resignations.service';
import { HrmTerminationsService } from './services/hrm-terminations.service';
import { HrmWarningsService } from './services/hrm-warnings.service';
import { HrmTripsService } from './services/hrm-trips.service';
import { HrmComplaintsService } from './services/hrm-complaints.service';
import { HrmTransfersService } from './services/hrm-transfers.service';
import { HrmHolidaysService } from './services/hrm-holidays.service';
import { HrmAnnouncementsService } from './services/hrm-announcements.service';
import { HrmTrainingTypesService } from './services/hrm-training-types.service';
import { HrmTrainingProgramsService } from './services/hrm-training-programs.service';
import { HrmTrainingSessionsService } from './services/hrm-training-sessions.service';
import { HrmEmployeeTrainingsService } from './services/hrm-employee-trainings.service';
import { HrmPerformanceIndicatorCategoriesService } from './services/hrm-performance-indicator-categories.service';
import { HrmPerformanceIndicatorsService } from './services/hrm-performance-indicators.service';
import { HrmEmployeePerformanceService } from './services/hrm-employee-performance.service';
import { HrmDocumentTypesService } from './services/hrm-document-types.service';
import { HrmEmployeeDocumentsService } from './services/hrm-employee-documents.service';

// Controllers
import { HrmBranchesController } from './controllers/hrm-branches.controller';
import { HrmDepartmentsController } from './controllers/hrm-departments.controller';
import { HrmDesignationsController } from './controllers/hrm-designations.controller';
import { HrmEmployeesController } from './controllers/hrm-employees.controller';
import { HrmAwardTypesController } from './controllers/hrm-award-types.controller';
import { HrmAwardsController } from './controllers/hrm-awards.controller';
import { HrmPromotionsController } from './controllers/hrm-promotions.controller';
import { HrmResignationsController } from './controllers/hrm-resignations.controller';
import { HrmTerminationsController } from './controllers/hrm-terminations.controller';
import { HrmWarningsController } from './controllers/hrm-warnings.controller';
import { HrmTripsController } from './controllers/hrm-trips.controller';
import { HrmComplaintsController } from './controllers/hrm-complaints.controller';
import { HrmTransfersController } from './controllers/hrm-transfers.controller';
import { HrmHolidaysController } from './controllers/hrm-holidays.controller';
import { HrmAnnouncementsController } from './controllers/hrm-announcements.controller';
import { HrmTrainingTypesController } from './controllers/hrm-training-types.controller';
import { HrmTrainingProgramsController } from './controllers/hrm-training-programs.controller';
import { HrmTrainingSessionsController } from './controllers/hrm-training-sessions.controller';
import { HrmEmployeeTrainingsController } from './controllers/hrm-employee-trainings.controller';
import { HrmPerformanceIndicatorCategoriesController } from './controllers/hrm-performance-indicator-categories.controller';
import { HrmPerformanceIndicatorsController } from './controllers/hrm-performance-indicators.controller';
import { HrmEmployeePerformanceController } from './controllers/hrm-employee-performance.controller';
import { HrmDocumentTypesController } from './controllers/hrm-document-types.controller';
import { HrmEmployeeDocumentsController } from './controllers/hrm-employee-documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    HrmBranches,
    HrmDepartments,
    HrmDesignations,
    HrmEmployees,
    HrmAwardTypes,
    HrmAwards,
    HrmPromotions,
    HrmResignations,
    HrmTerminations,
    HrmWarnings,
    HrmTrips,
    HrmComplaints,
    HrmTransfers,
    HrmHolidays,
    HrmAnnouncements,
    HrmTrainingTypes,
    HrmTrainingPrograms,
    HrmTrainingSessions,
    HrmEmployeeTrainings,
    HrmPerformanceIndicatorCategories,
    HrmPerformanceIndicators,
    HrmEmployeePerformance,
    HrmDocumentTypes,
    HrmEmployeeDocuments,
  ])],
  controllers: [
    HrmBranchesController,
    HrmDepartmentsController,
    HrmDesignationsController,
    HrmEmployeesController,
    HrmAwardTypesController,
    HrmAwardsController,
    HrmPromotionsController,
    HrmResignationsController,
    HrmTerminationsController,
    HrmWarningsController,
    HrmTripsController,
    HrmComplaintsController,
    HrmTransfersController,
    HrmHolidaysController,
    HrmAnnouncementsController,
    HrmTrainingTypesController,
    HrmTrainingProgramsController,
    HrmTrainingSessionsController,
    HrmEmployeeTrainingsController,
    HrmPerformanceIndicatorCategoriesController,
    HrmPerformanceIndicatorsController,
    HrmEmployeePerformanceController,
    HrmDocumentTypesController,
    HrmEmployeeDocumentsController,
  ],
  providers: [
    HrmBranchesService,
    HrmDepartmentsService,
    HrmDesignationsService,
    HrmEmployeesService,
    HrmAwardTypesService,
    HrmAwardsService,
    HrmPromotionsService,
    HrmResignationsService,
    HrmTerminationsService,
    HrmWarningsService,
    HrmTripsService,
    HrmComplaintsService,
    HrmTransfersService,
    HrmHolidaysService,
    HrmAnnouncementsService,
    HrmTrainingTypesService,
    HrmTrainingProgramsService,
    HrmTrainingSessionsService,
    HrmEmployeeTrainingsService,
    HrmPerformanceIndicatorCategoriesService,
    HrmPerformanceIndicatorsService,
    HrmEmployeePerformanceService,
    HrmDocumentTypesService,
    HrmEmployeeDocumentsService,
  ],
})
export class HrmModule {}
