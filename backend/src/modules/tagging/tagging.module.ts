import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { Customer } from '../customers/customer.entity';
import { CustomerTagAssignment } from './customer-tag-assignment.entity';
import { CustomerTag } from './customer-tag.entity';
import { TaggingController } from './tagging.controller';
import { TaggingService } from './tagging.service';

@Module({
  imports: [TenantTypeOrmModule.forFeature([CustomerTag, CustomerTagAssignment, Customer])],
  controllers: [TaggingController],
  providers: [TaggingService],
  exports: [TaggingService],
})
export class TaggingModule {}
