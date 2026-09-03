import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataAccessLog } from './entities/data-access-log.entity';
import { DataAccessController } from './data-access.controller';
import { DataAccessService } from './data-access.service';
import { DataAccessInterceptor } from './data-access.interceptor';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Global so any module can mark a handler with @LogDataAccess without importing
 * anything: the interceptor is registered once, in main.ts, and stays inert on
 * handlers that carry no decorator.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DataAccessLog]), RbacModule],
  controllers: [DataAccessController],
  providers: [DataAccessService, DataAccessInterceptor],
  exports: [DataAccessService, DataAccessInterceptor],
})
export class DataAccessModule {}
