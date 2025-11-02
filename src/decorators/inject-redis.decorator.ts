import { Inject } from '@nestjs/common';

import { DEFAULT_REDIS_NAME, REDIS_CLIENT } from '../constants/redis.constants';

/**
 * Decorator to inject a Redis client into a class constructor
 *
 * @param {string} [name='default'] - Name of the Redis connection to inject
 * @returns {ParameterDecorator} Parameter decorator for dependency injection
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @InjectRedis() private readonly redis: Redis,
 *     @InjectRedis('cache') private readonly cacheRedis: Redis,
 *   ) {}
 * }
 * ```
 */
export const InjectRedis = (name: string = DEFAULT_REDIS_NAME): ParameterDecorator => Inject(`${REDIS_CLIENT}_${name}`);
