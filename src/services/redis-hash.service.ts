import { Injectable, Logger } from '@nestjs/common';

import { RedisBaseService } from './redis-base.service';

import type { IRedisHashOperations } from '../interfaces/redis-service.interface';

/**
 * Redis Hash Operations Service
 *
 * Provides methods for working with Redis hash data type.
 * Hashes are maps between string fields and string values.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly hashService: RedisHashService) {}
 *
 *   async setUserProfile(userId: string, profile: Record<string, string>): Promise<void> {
 *     await this.hashService.set(`user:${userId}`, profile);
 *   }
 * }
 * ```
 */
@Injectable()
export class RedisHashService implements IRedisHashOperations {
    private readonly logger = new Logger(RedisHashService.name);

    constructor(private readonly baseService: RedisBaseService) {}

    /**
     * Check if a hash field exists
     *
     * @param {string} key - Redis key
     * @param {string} field - Field name
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<boolean>} True if field exists
     */
    async exists(key: string, field: string, clientName: string = 'default'): Promise<boolean> {
        const client = this.baseService.getClient(clientName);
        const result = await client.hexists(key, field);

        return result === 1;
    }

    /**
     * Get the value of a hash field
     *
     * @param {string} key - Redis key
     * @param {string} field - Field name
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} Value of the field, or null if field doesn't exist
     */
    async get(key: string, field: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.baseService.getClient(clientName);

        return client.hget(key, field);
    }

    /**
     * Get all fields and values in a hash
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<Record<string, string>>} Object with all field-value pairs
     */
    async getAll(key: string, clientName: string = 'default'): Promise<Record<string, string>> {
        const client = this.baseService.getClient(clientName);

        return client.hgetall(key);
    }

    /**
     * Set one or more hash fields
     *
     * @param {string} key - Redis key
     * @param {Record<string, string>} fieldValues - Object with field-value pairs
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of fields that were added
     */
    async set(key: string, fieldValues: Record<string, string>, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        return client.hset(key, fieldValues);
    }

    /**
     * Delete one or more hash fields
     *
     * @param {string} key - Redis key
     * @param {string | string[]} fields - Field(s) to delete
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of fields that were removed
     */
    async delete(key: string, fields: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);
        const fieldArray = Array.isArray(fields) ? fields : [fields];

        return client.hdel(key, ...fieldArray);
    }

    /**
     * Increment the integer value of a hash field
     *
     * @param {string} key - Redis key
     * @param {string} field - Field name
     * @param {number} [amount=1] - Amount to increment by
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} The value after increment
     */
    async increment(key: string, field: string, amount: number = 1, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        return client.hincrby(key, field, amount);
    }

    /**
     * Get all field names in a hash
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of field names
     */
    async keys(key: string, clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.hkeys(key);
    }

    /**
     * Get the number of fields in a hash
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of fields in the hash
     */
    async length(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        return client.hlen(key);
    }

    /**
     * Get values of multiple hash fields
     *
     * @param {string} key - Redis key
     * @param {string[]} fields - Array of field names
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<Array<string | null>>} Array of values (null for non-existent fields)
     */
    async mget(key: string, fields: string[], clientName: string = 'default'): Promise<Array<null | string>> {
        const client = this.baseService.getClient(clientName);

        return client.hmget(key, ...fields);
    }
}
