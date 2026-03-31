import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';

@Module({
  imports: [TenantTypeOrmModule.forFeature([Role, Permission])],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
