/**
 * @nam088/nestjs-redis
 * A NestJS wrapper for ioredis with advanced features
 *
 * @packageDocumentation
 */

// Constants
export * from './constants/redis.constants';

// Decorators
export * from './decorators/cacheable.decorator';

export * from './decorators/inject-redis.decorator';

// Errors
export * from './errors/redis.errors';

export * from './health/health.controller';

// Health check
export * from './health/health.module';

export * from './health/redis.health';

// Interfaces and types
export type * from './interfaces/redis-options.interface';

export type * from './interfaces/redis-service.interface';

// Main modules
export * from './redis-core.module';

export * from './redis.module';

// Services - Core
export * from './services/redis-base.service';

// Services - Domain-specific
export * from './services/redis-hash.service';

export * from './services/redis-list.service';

export * from './services/redis-lock.service';

export * from './services/redis-pubsub.service';

export * from './services/redis-set.service';

export * from './services/redis-sorted-set.service';

export * from './services/redis-string.service';

export * from './services/redis.service';

// Re-export ioredis types for convenience
export { Cluster, Redis } from 'ioredis';
