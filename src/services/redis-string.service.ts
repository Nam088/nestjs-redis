import { Injectable, Logger } from '@nestjs/common';

import { RedisSerializationError } from '../errors/redis.errors';

import { RedisBaseService } from './redis-base.service';

import type { IRedisStringOperations } from '../interfaces/redis-service.interface';

/**
 * Redis String Operations Service
 *
 * Provides methods for working with Redis string data type,
 * including basic get/set, JSON serialization, and atomic operations.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly stringService: RedisStringService) {}
 *
 *   async cacheUser(user: User): Promise<void> {
 *     await this.stringService.setJSON(`user:${user.id}`, user, 'default');
 *   }
 * }
 * ```
 */
@Injectable()
export class RedisStringService implements IRedisStringOperations {
    private readonly logger = new Logger(RedisStringService.name);

    constructor(private readonly baseService: RedisBaseService) {}

    /**
     * Get a string value from Redis
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} The value or null if key doesn't exist
     *
     * @example
     * ```typescript
     * const value = await stringService.get('myKey');
     * if (value) {
     *   console.log('Value:', value);
     * }
     * ```
     */
    async get(key: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.baseService.getClient(clientName);

        return client.get(key);
    }

    /**
     * Get a value and automatically parse JSON
     *
     * @template T - Type of the returned value
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<T | null>} Parsed value or null if key doesn't exist
     * @throws {RedisSerializationError} If JSON parsing fails
     */
    async getJSON<T = unknown>(key: string, clientName: string = 'default'): Promise<null | T> {
        const client = this.baseService.getClient(clientName);
        const value = await client.get(key);

        if (!value) return null;

        try {
            return JSON.parse(value) as T;
        } catch (err) {
            throw new RedisSerializationError(key, 'parse', err as Error);
        }
    }

    /**
     * Get and validate a JSON value using a custom validator
     *
     * @template T - Expected type of the returned value
     * @param {string} key - Redis key
     * @param {(value: unknown) => T} validator - Validation function that throws on invalid data
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<T | null>} Validated value or null if key doesn't exist
     * @throws {Error} If validation fails
     *
     * @example
     * ```typescript
     * const user = await stringService.getJSONValidated('user:1', (data) => {
     *   if (!data || typeof data !== 'object') throw new Error('Invalid user');
     *   return data as User;
     * });
     * ```
     */
    async getJSONValidated<T>(
        key: string,
        validator: (value: unknown) => T,
        clientName: string = 'default',
    ): Promise<null | T> {
        const value = await this.getJSON<unknown>(key, clientName);

        if (value === null) return null;

        return validator(value);
    }

    /**
     * Set a string value in Redis
     *
     * @param {string} key - Redis key
     * @param {string} value - Value to store
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     *
     * @example
     * ```typescript
     * await stringService.set('myKey', 'myValue');
     * ```
     */
    async set(key: string, value: string, clientName: string = 'default'): Promise<'OK'> {
        const client = this.baseService.getClient(clientName);

        return client.set(key, value);
    }

    /**
     * Set a JSON value
     * Automatically stringifies the value
     *
     * @param {string} key - Redis key
     * @param {unknown} value - Value to store (will be JSON stringified)
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     */
    async setJSON(key: string, value: unknown, clientName: string = 'default'): Promise<'OK'> {
        const client = this.baseService.getClient(clientName);

        return client.set(key, JSON.stringify(value));
    }

    /**
     * Set a value with TTL (time to live)
     * Automatically serializes non-string values to JSON
     *
     * @param {string} key - Redis key
     * @param {unknown} value - Value to store (will be JSON stringified if not a string)
     * @param {number} ttlSeconds - Time to live in seconds
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     */
    async setWithTTL(key: string, value: unknown, ttlSeconds: number, clientName: string = 'default'): Promise<'OK'> {
        const client = this.baseService.getClient(clientName);
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

        return client.setex(key, ttlSeconds, serializedValue);
    }

    /**
     * Decrement a numeric value
     *
     * @param {string} key - Redis key
     * @param {number} [amount=1] - Amount to decrement by
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} The value after decrement
     */
    async decrement(key: string, amount: number = 1, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        if (amount === 1) {
            return client.decr(key);
        }

        return client.decrby(key, amount);
    }

    /**
     * Increment a numeric value
     *
     * @param {string} key - Redis key
     * @param {number} [amount=1] - Amount to increment by
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} The value after increment
     */
    async increment(key: string, amount: number = 1, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        if (amount === 1) {
            return client.incr(key);
        }

        return client.incrby(key, amount);
    }

    /**
     * Get multiple values at once
     *
     * @param {string[]} keys - Array of keys to get
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<Array<string | null>>} Array of values (null for non-existent keys)
     */
    async mget(keys: string[], clientName: string = 'default'): Promise<Array<null | string>> {
        const client = this.baseService.getClient(clientName);

        return client.mget(...keys);
    }

    /**
     * Set multiple key-value pairs at once
     *
     * @param {Record<string, string>} keyValues - Object with key-value pairs
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     */
    async mset(keyValues: Record<string, string>, clientName: string = 'default'): Promise<'OK'> {
        const client = this.baseService.getClient(clientName);
        const args: string[] = [];

        for (const [key, value] of Object.entries(keyValues)) {
            args.push(key, value);
        }

        return client.mset(...args);
    }
}
