import { Logger } from '@nestjs/common';

/**
 * Injection token for RedisService in decorators
 */
export const REDIS_SERVICE = Symbol('REDIS_SERVICE');

/**
 * Options for the Cacheable decorator
 */
export interface CacheableOptions {
    /**
     * Name of the Redis connection to use
     * @default 'default'
     */
    clientName?: string;

    /**
     * Cache key or function to generate key from method arguments
     *
     * Supports template syntax with argument placeholders:
     * - `{{0}}` - First argument
     * - `{{1}}` - Second argument
     * - `{{args}}` - All arguments as JSON
     * - `{{name.property}}` - Named argument property
     *
     * @example
     * ```typescript
     * // Static key
     * @Cacheable({ key: 'users:all' })
     *
     * // Template with argument
     * @Cacheable({ key: 'user:{{0}}' })
     *
     * // Function
     * @Cacheable({ key: (id, options) => `user:${id}:${options.type}` })
     * ```
     */
    key: ((...args: any[]) => string) | string;

    /**
     * Prefix for all cache keys created by this decorator
     * @default 'cache:'
     */
    prefix?: string;

    /**
     * Time to live in seconds
     * If not specified, the cached value will never expire
     */
    ttl?: number;

    /**
     * Condition function to determine if the result should be cached
     * Return false to skip caching
     *
     * @example
     * ```typescript
     * @Cacheable({
     *   key: 'user:{{0}}',
     *   unless: (result) => result === null
     * })
     * ```
     */
    unless?: (result: any) => boolean;
}

/**
 * Metadata key for storing cacheable configuration
 */
export const CACHEABLE_METADATA = Symbol('cacheable');

/**
 * Options for the CacheEvict decorator
 */
export interface CacheEvictOptions {
    /**
     * If true, evict all keys matching the pattern (using SCAN)
     * The key will be treated as a glob pattern
     * @default false
     */
    allEntries?: boolean;

    /**
     * Whether to evict before or after method execution
     * @default false (after)
     */
    beforeInvocation?: boolean;

    /**
     * Name of the Redis connection to use
     * @default 'default'
     */
    clientName?: string;

    /**
     * Cache key(s) to evict
     * Supports the same template syntax as Cacheable
     */
    key: ((...args: any[]) => string | string[]) | string | string[];

    /**
     * Prefix for cache keys
     * @default 'cache:'
     */
    prefix?: string;
}

/**
 * Cache decorator factory
 *
 * Creates a method decorator that caches the return value in Redis.
 * On subsequent calls with the same key, returns the cached value instead
 * of executing the method.
 *
 * @param {CacheableOptions} options - Cache configuration options
 * @returns {MethodDecorator} Method decorator
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly redisService: RedisService) {}
 *
 *   @Cacheable({ key: 'user:{{0}}', ttl: 300 })
 *   async getUser(id: string): Promise<User> {
 *     // This will only execute if not in cache
 *     return await this.database.findUser(id);
 *   }
 *
 *   @Cacheable({
 *     key: (page, limit) => `users:list:${page}:${limit}`,
 *     ttl: 60,
 *     unless: (result) => result.length === 0
 *   })
 *   async listUsers(page: number, limit: number): Promise<User[]> {
 *     return await this.database.findUsers({ page, limit });
 *   }
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions): MethodDecorator {
    const logger = new Logger('Cacheable');

    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Get RedisService from the instance
            const { redisService } = this as any;

            if (!redisService) {
                logger.warn(
                    `RedisService not found in ${target.constructor.name}. ` +
                        'Make sure to inject RedisService as "redisService" property.',
                );

                return originalMethod.apply(this, args);
            }

            const { clientName = 'default', prefix = 'cache:', ttl, unless } = options;

            // Generate cache key
            const cacheKey = prefix + generateCacheKey(options.key, args);

            try {
                // Try to get from cache
                const cached = await redisService.get(cacheKey, clientName);

                if (cached !== null) {
                    logger.debug(`Cache HIT: ${cacheKey}`);

                    return JSON.parse(cached);
                }

                logger.debug(`Cache MISS: ${cacheKey}`);
            } catch (error) {
                logger.warn(`Cache read error for ${cacheKey}:`, error);
                // Continue to execute the method
            }

            // Execute original method
            const result = await originalMethod.apply(this, args);

            // Check unless condition
            if (unless && unless(result)) {
                logger.debug(`Cache SKIP (unless condition): ${cacheKey}`);

                return result;
            }

            // Store in cache
            try {
                const serialized = JSON.stringify(result);

                if (ttl) {
                    await redisService.setWithTTL(cacheKey, serialized, ttl, clientName);
                } else {
                    await redisService.set(cacheKey, serialized, clientName);
                }

                // eslint-disable-next-line sonarjs/no-nested-template-literals
                logger.debug(`Cache SET: ${cacheKey}${ttl ? ` (TTL: ${ttl}s)` : ''}`);
            } catch (error) {
                logger.warn(`Cache write error for ${cacheKey}:`, error);
            }

            return result;
        };

        // Preserve metadata
        Reflect.defineMetadata(CACHEABLE_METADATA, options, descriptor.value);

        return descriptor;
    };
}

/**
 * Cache eviction decorator
 *
 * Removes entries from the cache when the decorated method is called.
 *
 * @param {CacheEvictOptions} options - Eviction configuration options
 * @returns {MethodDecorator} Method decorator
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly redisService: RedisService) {}
 *
 *   @CacheEvict({ key: 'user:{{0}}' })
 *   async updateUser(id: string, data: UpdateUserDto): Promise<User> {
 *     return await this.database.updateUser(id, data);
 *   }
 *
 *   @CacheEvict({ key: 'users:*', allEntries: true })
 *   async clearUserCache(): Promise<void> {
 *     // All user cache entries will be evicted
 *   }
 * }
 * ```
 */
export function CacheEvict(options: CacheEvictOptions): MethodDecorator {
    const logger = new Logger('CacheEvict');

    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const { redisService } = this as any;

            if (!redisService) {
                logger.warn(
                    `RedisService not found in ${target.constructor.name}. ` +
                        'Make sure to inject RedisService as "redisService" property.',
                );

                return originalMethod.apply(this, args);
            }

            const { allEntries = false, beforeInvocation = false, clientName = 'default', prefix = 'cache:' } = options;

            const evict = async (): Promise<void> => {
                try {
                    const keys = generateEvictKeys(options.key, args, prefix);

                    if (allEntries) {
                        // Use SCAN to find and delete matching keys
                        for (const pattern of keys) {
                            const matchingKeys = await redisService.scanKeysToArray(pattern, 100, clientName);

                            if (matchingKeys.length > 0) {
                                await redisService.delete(matchingKeys, clientName);
                                logger.debug(`Cache EVICT pattern ${pattern}: ${matchingKeys.length} keys`);
                            }
                        }
                    } else {
                        if (keys.length > 0) {
                            await redisService.delete(keys, clientName);
                            logger.debug(`Cache EVICT: ${keys.join(', ')}`);
                        }
                    }
                } catch (error) {
                    logger.warn('Cache eviction error:', error);
                }
            };

            if (beforeInvocation) {
                await evict();
            }

            const result = await originalMethod.apply(this, args);

            if (!beforeInvocation) {
                await evict();
            }

            return result;
        };

        return descriptor;
    };
}

/**
 * Generate cache key from template or function
 */
function generateCacheKey(keyConfig: ((...args: any[]) => string) | string, args: any[]): string {
    if (typeof keyConfig === 'function') {
        return keyConfig(...args);
    }

    // Template replacement
    let key = keyConfig;

    // Replace {{args}} with all arguments
    key = key.replace(/\{\{args\}\}/g, JSON.stringify(args));

    // Replace {{0}}, {{1}}, etc. with positional arguments
    key = key.replace(/\{\{(\d+)\}\}/g, (_, index) => {
        const value = args[parseInt(index, 10)];

        if (value === undefined) return '';

        if (typeof value === 'object') return JSON.stringify(value);

        return String(value);
    });

    // Replace {{name.property}} with nested properties
    key = key.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, argIndex, property) => {
        const arg = args[parseInt(argIndex, 10)];

        if (arg && typeof arg === 'object' && property in arg) {
            const value = arg[property];

            if (typeof value === 'object') return JSON.stringify(value);

            return String(value);
        }

        return '';
    });

    return key;
}

/**
 * Generate keys to evict
 */
function generateEvictKeys(
    keyConfig: ((...args: any[]) => string | string[]) | string | string[],
    args: any[],
    prefix: string,
): string[] {
    let keys: string[];

    if (typeof keyConfig === 'function') {
        const result = keyConfig(...args);

        keys = Array.isArray(result) ? result : [result];
    } else {
        keys = Array.isArray(keyConfig) ? keyConfig : [keyConfig];
    }

    return keys.map((key) => prefix + generateCacheKey(key, args));
}
