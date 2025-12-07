import { Injectable, Logger } from '@nestjs/common';

import { RedisBaseService } from './redis-base.service';

import type { IRedisListOperations } from '../interfaces/redis-service.interface';

/**
 * Redis List Operations Service
 *
 * Provides methods for working with Redis list data type.
 * Lists are linked lists of string values.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class QueueService {
 *   constructor(private readonly listService: RedisListService) {}
 *
 *   async enqueue(item: string): Promise<void> {
 *     await this.listService.pushRight('queue:jobs', item);
 *   }
 *
 *   async dequeue(): Promise<string | null> {
 *     return this.listService.popLeft('queue:jobs');
 *   }
 * }
 * ```
 */
@Injectable()
export class RedisListService implements IRedisListOperations {
    private readonly logger = new Logger(RedisListService.name);

    constructor(private readonly baseService: RedisBaseService) {}

    /**
     * Set the value of an element in a list by its index
     *
     * @param {string} key - Redis key
     * @param {number} index - Index (0-based)
     * @param {string} value - New value
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     */
    async setByIndex(key: string, index: number, value: string, clientName: string = 'default'): Promise<'OK'> {
        const client = this.baseService.getClient(clientName);

        return client.lset(key, index, value);
    }

    /**
     * Get an element from a list by its index
     *
     * @param {string} key - Redis key
     * @param {number} index - Index (0-based, negative for from end)
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} Element at index, or null if index is out of range
     */
    async index(key: string, index: number, clientName: string = 'default'): Promise<null | string> {
        const client = this.baseService.getClient(clientName);

        return client.lindex(key, index);
    }

    /**
     * Get the length of a list
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Length of the list
     */
    async length(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);

        return client.llen(key);
    }

    /**
     * Remove and get the first element in a list
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} The value of the first element, or null when key doesn't exist
     */
    async popLeft(key: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.baseService.getClient(clientName);

        return client.lpop(key);
    }

    /**
     * Remove and get the last element in a list
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} The value of the last element, or null when key doesn't exist
     */
    async popRight(key: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.baseService.getClient(clientName);

        return client.rpop(key);
    }

    /**
     * Push one or more values to the head of a list
     *
     * @param {string} key - Redis key
     * @param {string | string[]} values - Value(s) to push
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Length of the list after push
     */
    async pushLeft(key: string, values: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);
        const valueArray = Array.isArray(values) ? values : [values];

        return client.lpush(key, ...valueArray);
    }

    /**
     * Push one or more values to the tail of a list
     *
     * @param {string} key - Redis key
     * @param {string | string[]} values - Value(s) to push
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Length of the list after push
     */
    async pushRight(key: string, values: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.baseService.getClient(clientName);
        const valueArray = Array.isArray(values) ? values : [values];

        return client.rpush(key, ...valueArray);
    }

    /**
     * Get a range of elements from a list
     *
     * @param {string} key - Redis key
     * @param {number} start - Start index (0-based)
     * @param {number} stop - Stop index (-1 means last element)
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of elements in the specified range
     */
    async range(key: string, start: number, stop: number, clientName: string = 'default'): Promise<string[]> {
        const client = this.baseService.getClient(clientName);

        return client.lrange(key, start, stop);
    }

    /**
     * Trim a list to the specified range
     *
     * @param {string} key - Redis key
     * @param {number} start - Start index
     * @param {number} stop - Stop index
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     */
    async trim(key: string, start: number, stop: number, clientName: string = 'default'): Promise<'OK'> {
        const client = this.baseService.getClient(clientName);

        return client.ltrim(key, start, stop);
    }
}
