import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { JobPost } from './entities/job-post.entity';
import { JobApplication } from './entities/job-application.entity';
import { Interview } from './entities/interview.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPost, JobApplication, Interview]),
    RbacModule
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService]
})
export class RecruitmentModule {}
