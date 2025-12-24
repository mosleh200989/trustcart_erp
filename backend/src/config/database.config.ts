import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USER', 'postgres'),
      password: this.configService.get('DB_PASSWORD', 'admin'),
      database: this.configService.get('DB_NAME', 'trustcart_erp'),
      entities: [
        isProduction ? 'dist/**/*.entity{.ts,.js}' : 'src/**/*.entity{.ts,.js}'
      ],
      migrations: ['dist/migrations/**/*{.ts,.js}'],
      subscribers: ['dist/subscribers/**/*{.ts,.js}'],
      synchronize: false, // Schema already exists in database, use migrations instead
      logging: this.configService.get('NODE_ENV') === 'development',
      migrationsRun: false, // Only run if migrations exist
      ssl: this.configService.get('NODE_ENV') === 'production'
        ? { rejectUnauthorized: false }
        : false,
      extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    };
  }
}
