import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrmBranches } from './entities/hrm-branches.entity';
import { HrmDepartments } from './entities/hrm-departments.entity';
import { HrmDesignations } from './entities/hrm-designations.entity';
import { HrmEmployees } from './entities/hrm-employees.entity';
// ...import all other entities as you scaffold them
import { HrmBranchesService } from './services/hrm-branches.service';
import { HrmBranchesController } from './controllers/hrm-branches.controller';
// ...import all other services/controllers as you scaffold them

@Module({
  imports: [TypeOrmModule.forFeature([
    HrmBranches,
    HrmDepartments,
    HrmDesignations,
    HrmEmployees,
    // ...add all other entities here
  ])],
  controllers: [
    HrmBranchesController,
    // ...add all other controllers here
  ],
  providers: [
    HrmBranchesService,
    // ...add all other services here
  ],
})
export class HrmModule {}
