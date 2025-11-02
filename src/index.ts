/**
 * @nam088/nestjs-redis
 * A NestJS wrapper for ioredis with advanced features
 *
 * @packageDocumentation
 */

// Constants
export * from './constants/redis.constants';

// Decorators
export * from './decorators/inject-redis.decorator';

export * from './health/health.controller';

// Health check
export * from './health/health.module';

export * from './health/redis.health';

// Interfaces and types
export type * from './interfaces/redis-options.interface';

// Main modules
export * from './redis-core.module';

export * from './redis.module';

// Services
export * from './services/redis.service';

// Re-export ioredis types for convenience
export { Cluster, Redis } from 'ioredis';
