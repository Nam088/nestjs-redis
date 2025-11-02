import { Controller, Get, Param } from '@nestjs/common';

import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';

import { RedisHealthIndicator } from './redis.health';

/**
 * Health Check Controller
 * Provides endpoints for checking application health status
 */
@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly redisHealth: RedisHealthIndicator,
    ) {}

    /**
     * Basic health check endpoint
     * Checks the default Redis connection
     * @returns Health check result
     */
    @Get()
    @HealthCheck()
    check(): Promise<HealthCheckResult> {
        return this.health.check([() => this.redisHealth.isHealthy('redis')]);
    }

    /**
     * Check all Redis connections
     * @returns Health check result for all connections
     */
    @Get('redis')
    @HealthCheck()
    checkRedis(): Promise<HealthCheckResult> {
        return this.health.check([() => this.redisHealth.checkAllConnections('redis')]);
    }

    /**
     * Check specific Redis connection
     * @returns Health check result for specific connection
     */
    @Get('redis/:name')
    @HealthCheck()
    checkRedisConnection(@Param('name') name: string): Promise<HealthCheckResult> {
        return this.health.check([() => this.redisHealth.isHealthy('redis', name)]);
    }
}
