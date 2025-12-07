import { Injectable, Logger } from '@nestjs/common';

import { RedisBaseService } from './redis-base.service';

import type { IRedisSetOperations } from '../interfaces/redis-service.interface';

/**
 * Redis Set Operations Service
 *
 * Provides methods for working with Redis set data type.
 * Sets are unordered collections of unique string values.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class TagService {
 *   constructor(private readonly setService: RedisSetService) {}
 *
 *   async addTags(postId: string, tags: string[]): Promise<void> {
 *     await this.setService.add(`post:${postId}:tags`, tags);
 *   }
 *
 *   async getTags(postId: string): Promise<string[]> {
 *     return this.setService.members(`post:${postId}:tags`);
 *   }
 * }
 * ```
 */
@Injectable()
export class RedisSetService implements IRedisSetOperations {
    private readonly logger = new Logger(RedisSetService.name);

    constructor(private readonly baseService: RedisBaseService) {}

    /**
     * Add one or more members to a set
     *
     * @param {string} key - Redis key
     * @param {string | string[]} members - Member(s) to add
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of members added to the set
     */
    async add(key: string, members: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);
        const memberArray = Array.isArray(members) ? members : [members];

        return client.sadd(key, ...memberArray);
    }

    /**
     * Get the number of members in a set
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of members in the set
     */
    async count(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        return client.scard(key);
    }

    /**
     * Remove one or more members from a set
     *
     * @param {string} key - Redis key
     * @param {string | string[]} members - Member(s) to remove
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of members removed from the set
     */
    async remove(key: string, members: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);
        const memberArray = Array.isArray(members) ? members : [members];

        return client.srem(key, ...memberArray);
    }

    /**
     * Get the difference between sets
     *
     * @param {string[]} keys - Array of set keys (first set minus others)
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of members in first set but not in others
     */
    async difference(keys: string[], clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.sdiff(...keys);
    }

    /**
     * Get the intersection of multiple sets
     *
     * @param {string[]} keys - Array of set keys
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of members in all sets
     */
    async intersection(keys: string[], clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.sinter(...keys);
    }

    /**
     * Check if a member exists in a set
     *
     * @param {string} key - Redis key
     * @param {string} member - Member to check
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<boolean>} True if member exists in set
     */
    async isMember(key: string, member: string, clientName: string = 'default'): Promise<boolean> {
        const client = this.baseService.getClient(clientName);
        const result = await client.sismember(key, member);

        return result === 1;
    }

    /**
     * Get all members of a set
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of set members
     */
    async members(key: string, clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.smembers(key);
    }

    /**
     * Remove and return a random member from a set
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} Removed member, or null if set is empty
     */
    async pop(key: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.baseService.getClient(clientName);

        return client.spop(key);
    }

    /**
     * Get a random member from a set
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} Random member, or null if set is empty
     */
    async randomMember(key: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.baseService.getClient(clientName);

        return client.srandmember(key);
    }

    /**
     * Get the union of multiple sets
     *
     * @param {string[]} keys - Array of set keys
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of members in any set
     */
    async union(keys: string[], clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.sunion(...keys);
    }
}
