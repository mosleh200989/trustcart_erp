import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { UserSessionsModule } from '../user-sessions/user-sessions.module';
import { User } from '../users/user.entity';
import { Customer } from '../customers/customer.entity';
import { requireJwtSecret } from '../../common/jwt-secret';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Customer]),
    UsersModule,
    RbacModule,
    UserSessionsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // registerAsync, not register: the plain form evaluates its options while
    // this file is still being imported, which is before ConfigModule has read
    // .env into process.env — the secret would look missing and the app would
    // refuse to start. Depending on ConfigService is what orders the factory
    // after that load, even though the secret itself comes from process.env.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        secret: requireJwtSecret(),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
