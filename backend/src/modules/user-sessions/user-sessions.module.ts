import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSession } from './entities/user-session.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { UserSessionsController } from './user-sessions.controller';
import { UserSessionsService } from './user-sessions.service';
import { LoginAttemptsService } from './login-attempts.service';
import { RbacModule } from '../rbac/rbac.module';

/**
 * AuthModule imports this to record and validate sessions, so the service is
 * exported and this module must not import AuthModule back.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserSession, LoginAttempt]), RbacModule],
  controllers: [UserSessionsController],
  providers: [UserSessionsService, LoginAttemptsService],
  exports: [UserSessionsService, LoginAttemptsService],
})
export class UserSessionsModule {}
