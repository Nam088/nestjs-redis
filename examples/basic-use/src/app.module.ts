import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule, HealthModule } from '@nam088/nestjs-redis';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheController } from './cache.controller';
import { CounterController } from './counter.controller';
import { ListController } from './list.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Load environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Configure Redis using environment variables
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        password: configService.get<string>('REDIS_PASSWORD'),
        username: configService.get<string>('REDIS_USERNAME', 'default'),
        keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'example:'),
        // TLS configuration for Redis Cloud
        // tls: configService.get<string>('REDIS_TLS') === 'false' ? undefined : {},
      }),
    }),
    TerminusModule,
    HealthModule,
  ],
  controllers: [
    AppController,
    CacheController,
    CounterController,
    ListController,
    UserController,
    HealthController,
  ],
  providers: [AppService, UserService],
})
export class AppModule {}
