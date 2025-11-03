import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from '@nam088/nestjs-redis';

/**
 * Health Check Controller
 * Provides endpoints for checking application health status
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  /**
   * Basic health check endpoint
   * Checks the default Redis connection
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Check if Redis connection is healthy',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check passed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.redisHealth.isHealthy('redis')]);
  }

  /**
   * Detailed health check
   */
  @Get('detailed')
  @HealthCheck()
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Check all Redis connections with detailed information',
  })
  @ApiResponse({ status: 200, description: 'Detailed health check passed' })
  @ApiResponse({ status: 503, description: 'One or more health checks failed' })
  checkDetailed(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.redisHealth.checkAllConnections('redis-all'),
    ]);
  }
}
