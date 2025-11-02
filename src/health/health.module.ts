import { Module } from '@nestjs/common';

import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

/**
 * Health Module
 * Provides health check functionality for the application
 */
@Module({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [RedisHealthIndicator],
    exports: [RedisHealthIndicator],
})
export class HealthModule {}
