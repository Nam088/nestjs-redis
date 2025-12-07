import { Injectable, Logger } from '@nestjs/common';

import { RedisBaseService } from './redis-base.service';

import type { IRedisSortedSetOperations } from '../interfaces/redis-service.interface';

/**
 * Redis Sorted Set Operations Service
 *
 * Provides methods for working with Redis sorted set data type.
 * Sorted sets are sets where each member has an associated score.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class LeaderboardService {
 *   constructor(private readonly sortedSetService: RedisSortedSetService) {}
 *
 *   async updateScore(userId: string, score: number): Promise<void> {
 *     await this.sortedSetService.add('leaderboard', [{ member: userId, score }]);
 *   }
 *
 *   async getTopPlayers(count: number): Promise<string[]> {
 *     return this.sortedSetService.rangeReverse('leaderboard', 0, count - 1);
 *   }
 * }
 * ```
 */
@Injectable()
export class RedisSortedSetService implements IRedisSortedSetOperations {
    private readonly logger = new Logger(RedisSortedSetService.name);

    constructor(private readonly baseService: RedisBaseService) {}

    /**
     * Add one or more members to a sorted set, or update the score if it already exists
     *
     * @param {string} key - Redis key
     * @param {Array<{score: number, member: string}>} members - Array of score-member pairs
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of elements added to the sorted set
     */
    async add(
        key: string,
        members: Array<{ member: string; score: number }>,
        clientName: string = 'default',
    ): Promise<number> {
        const client = this.baseService.getClient(clientName);
        const args: Array<number | string> = [];

        for (const { member, score } of members) {
            args.push(score, member);
        }

        return client.zadd(key, ...args);
    }

    /**
     * Get the number of members in a sorted set
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of members in the sorted set
     */
    async count(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        return client.zcard(key);
    }

    /**
     * Get count of members with score between min and max
     *
     * @param {string} key - Redis key
     * @param {number} min - Minimum score
     * @param {number} max - Maximum score
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Count of members in score range
     */
    async countByScore(key: string, min: number, max: number, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        return client.zcount(key, min, max);
    }

    /**
     * Remove one or more members from a sorted set
     *
     * @param {string} key - Redis key
     * @param {string | string[]} members - Member(s) to remove
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of members removed
     */
    async remove(key: string, members: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);
        const memberArray = Array.isArray(members) ? members : [members];

        return client.zrem(key, ...memberArray);
    }

    /**
     * Increment the score of a member
     *
     * @param {string} key - Redis key
     * @param {string} member - Member name
     * @param {number} amount - Amount to increment by
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string>} New score as string
     */
    async incrementScore(key: string, member: string, amount: number, clientName: string = 'default'): Promise<string> {
        const client = this.baseService.getClient(clientName);

        return client.zincrby(key, amount, member);
    }

    /**
     * Get a range of members from a sorted set by index (low to high score)
     *
     * @param {string} key - Redis key
     * @param {number} start - Start index (0-based)
     * @param {number} stop - Stop index (-1 means last element)
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of members in the specified range
     */
    async range(key: string, start: number, stop: number, clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.zrange(key, start, stop);
    }

    /**
     * Get a range of members from a sorted set by score
     *
     * @param {string} key - Redis key
     * @param {number} min - Minimum score
     * @param {number} max - Maximum score
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of members in the specified score range
     */
    async rangeByScore(key: string, min: number, max: number, clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.zrangebyscore(key, min, max);
    }

    /**
     * Get a range of members from a sorted set by index (high to low score)
     *
     * @param {string} key - Redis key
     * @param {number} start - Start index (0-based)
     * @param {number} stop - Stop index (-1 means last element)
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of members in the specified range, highest score first
     */
    async rangeReverse(key: string, start: number, stop: number, clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.zrevrange(key, start, stop);
    }

    /**
     * Get the rank of a member in a sorted set (0-based, low to high)
     *
     * @param {string} key - Redis key
     * @param {string} member - Member name
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number | null>} Rank of the member, or null if not found
     */
    async rank(key: string, member: string, clientName: string = 'default'): Promise<null | number> {
        const client = this.baseService.getClient(clientName);

        return client.zrank(key, member);
    }

    /**
     * Get the reverse rank of a member (0-based, high to low)
     *
     * @param {string} key - Redis key
     * @param {string} member - Member name
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number | null>} Reverse rank of the member, or null if not found
     */
    async reverseRank(key: string, member: string, clientName: string = 'default'): Promise<null | number> {
        const client = this.baseService.getClient(clientName);

        return client.zrevrank(key, member);
    }

    /**
     * Get the score of a member in a sorted set
     *
     * @param {string} key - Redis key
     * @param {string} member - Member name
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} Score of the member, or null if member doesn't exist
     */
    async score(key: string, member: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.baseService.getClient(clientName);

        return client.zscore(key, member);
    }
}
