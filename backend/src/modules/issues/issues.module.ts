import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './entities/issue.entity';
import { IssueComment } from './entities/issue-comment.entity';
import { IssueAttachment } from './entities/issue-attachment.entity';
import { IssueEvent } from './entities/issue-event.entity';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issue, IssueComment, IssueAttachment, IssueEvent]),
    RbacModule,
  ],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
