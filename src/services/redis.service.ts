import { Injectable, Logger } from '@nestjs/common';

import Redis, { Cluster } from 'ioredis';

import { DEFAULT_REDIS_NAME } from '../constants/redis.constants';

import { RedisBaseService } from './redis-base.service';
import { RedisHashService } from './redis-hash.service';
import { RedisListService } from './redis-list.service';
import { RedisSetService } from './redis-set.service';
import { RedisSortedSetService } from './redis-sorted-set.service';
import { RedisStringService } from './redis-string.service';

import type { IRedisService } from '../interfaces/redis-service.interface';

/**
 * Redis Service - Unified interface for all Redis operations
 *
 * All methods from domain services are available directly:
 * - String: get, set, getJSON, setJSON, setWithTTL, mget, mset, increment, decrement
 * - Hash: hashGet, hashSet, hashGetAll, hashDelete, hashExists, hashKeys, hashLength
 * - List: listPush, listPop, listRange, listLength, listIndex, listTrim
 * - Set: setAdd, setRemove, setMembers, setIsMember, setCount, setIntersection, setUnion
 * - Sorted Set: zAdd, zRemove, zRange, zScore, zRank, zCount, zIncrementScore
 * - Base: exists, delete, keys, expire, persist, getTTL, flushDB, rename, type, scanKeys
 *
 * @example
 * ```typescript
 * // All methods available directly
 * await redis.get('key');
 * await redis.hashGetAll('user:123');
 * await redis.listPush('queue', 'item');
 * await redis.setAdd('tags', ['a', 'b']);
 * await redis.zRange('leaderboard', 0, 10);
 * ```
 */
@Injectable()
export class RedisService extends RedisBaseService implements IRedisService {
    protected override readonly logger = new Logger(RedisService.name);

    private readonly _hashes: RedisHashService;
    private readonly _lists: RedisListService;
    private readonly _sets: RedisSetService;
    private readonly _sortedSets: RedisSortedSetService;
    private readonly _strings: RedisStringService;

    constructor() {
        super();
        this._strings = new RedisStringService(this);
        this._hashes = new RedisHashService(this);
        this._lists = new RedisListService(this);
        this._sets = new RedisSetService(this);
        this._sortedSets = new RedisSortedSetService(this);
    }

    // ==================== String Operations ====================

    /**
     * Publish a message to a channel
     *
     * @param {string} channel - Channel name
     * @param {string} message - Message to publish
     * @param {string} [clientName='default'] - Name of the Redis connection
     * @returns {Promise<number>} Number of subscribers that received the message
     */
    async publish(channel: string, message: string, clientName: string = DEFAULT_REDIS_NAME): Promise<number> {
        const client = this.getClient(clientName);

        return client.publish(channel, message);
    }

    /** @see RedisStringService.decrement */
    decrement = (key: string, amount?: number, clientName?: string) => this._strings.decrement(key, amount, clientName);

    /** @see RedisStringService.get */
    get = (key: string, clientName?: string) => this._strings.get(key, clientName);

    /** @see RedisStringService.getJSON */
    getJSON = <T = unknown>(key: string, clientName?: string) => this._strings.getJSON<T>(key, clientName);

    /** @see RedisStringService.getJSONValidated */
    getJSONValidated = <T>(key: string, validator: (value: unknown) => T, clientName?: string) =>
        this._strings.getJSONValidated<T>(key, validator, clientName);

    /** @see RedisHashService.delete */
    hashDelete = (key: string, fields: string | string[], clientName?: string) =>
        this._hashes.delete(key, fields, clientName);

    /** @see RedisHashService.exists */
    hashExists = (key: string, field: string, clientName?: string) => this._hashes.exists(key, field, clientName);

    /** @see RedisHashService.get */
    hashGet = (key: string, field: string, clientName?: string) => this._hashes.get(key, field, clientName);

    /** @see RedisHashService.getAll */
    hashGetAll = (key: string, clientName?: string) => this._hashes.getAll(key, clientName);

    /** @see RedisHashService.increment */
    hashIncrement = (key: string, field: string, amount?: number, clientName?: string) =>
        this._hashes.increment(key, field, amount, clientName);

    // ==================== Hash Operations ====================

    /** @see RedisHashService.keys */
    hashKeys = (key: string, clientName?: string) => this._hashes.keys(key, clientName);

    /** @see RedisHashService.length */
    hashLength = (key: string, clientName?: string) => this._hashes.length(key, clientName);

    /** @see RedisHashService.mget */
    hashMget = (key: string, fields: string[], clientName?: string) => this._hashes.mget(key, fields, clientName);

    /** @see RedisHashService.set */
    hashSet = (key: string, fieldValues: Record<string, string>, clientName?: string) =>
        this._hashes.set(key, fieldValues, clientName);

    /** @see RedisStringService.increment */
    increment = (key: string, amount?: number, clientName?: string) => this._strings.increment(key, amount, clientName);

    /** @see RedisListService.index */
    listIndex = (key: string, index: number, clientName?: string) => this._lists.index(key, index, clientName);

    /** @see RedisListService.length */
    listLength = (key: string, clientName?: string) => this._lists.length(key, clientName);

    /** @see RedisListService.popLeft */
    listPopLeft = (key: string, clientName?: string) => this._lists.popLeft(key, clientName);

    /** @see RedisListService.popRight */
    listPopRight = (key: string, clientName?: string) => this._lists.popRight(key, clientName);

    // ==================== List Operations ====================

    /** @see RedisListService.pushLeft */
    listPushLeft = (key: string, values: string | string[], clientName?: string) =>
        this._lists.pushLeft(key, values, clientName);

    /** @see RedisListService.pushRight */
    listPushRight = (key: string, values: string | string[], clientName?: string) =>
        this._lists.pushRight(key, values, clientName);

    /** @see RedisListService.range */
    listRange = (key: string, start: number, stop: number, clientName?: string) =>
        this._lists.range(key, start, stop, clientName);

    /** @see RedisListService.setByIndex */
    listSetByIndex = (key: string, index: number, value: string, clientName?: string) =>
        this._lists.setByIndex(key, index, value, clientName);

    /** @see RedisListService.trim */
    listTrim = (key: string, start: number, stop: number, clientName?: string) =>
        this._lists.trim(key, start, stop, clientName);

    /** @see RedisStringService.mget */
    mget = (keys: string[], clientName?: string) => this._strings.mget(keys, clientName);

    /** @see RedisStringService.mset */
    mset = (keyValues: Record<string, string>, clientName?: string) => this._strings.mset(keyValues, clientName);

    /**
     * Execute commands in a pipeline (batched, non-atomic)
     *
     * @param {(pipeline: ReturnType<Redis['pipeline']>) => void} pipelineBuilder - Pipeline builder
     * @param {string} [clientName='default'] - Name of the Redis connection
     * @returns {Promise<Array<[Error | null, unknown]> | null>} Pipeline results
     */
    async pipeline(
        pipelineBuilder: (pipeline: ReturnType<Redis['pipeline']>) => void,
        clientName: string = DEFAULT_REDIS_NAME,
    ): Promise<Array<[Error | null, unknown]> | null> {
        const client = this.getClient(clientName);

        if (client instanceof Cluster) {
            this.logger.warn('Pipeline is not fully supported in cluster mode');
        }

        const pipeline = (client as Redis).pipeline();

        pipelineBuilder(pipeline);

        return pipeline.exec();
    }

    /**
     * Subscribe to Redis channels matching pattern
     *
     * @param {string | string[]} patterns - Pattern(s) to subscribe
     * @param {(pattern: string, channel: string, message: string) => void} callback - Message handler
     * @param {string} [clientName='default'] - Name of the Redis connection
     * @returns {Promise<() => Promise<void>>} Cleanup function
     */
    async psubscribe(
        patterns: string | string[],
        callback: (pattern: string, channel: string, message: string) => void,
        clientName: string = DEFAULT_REDIS_NAME,
    ): Promise<() => Promise<void>> {
        const client = this.getClient(clientName);
        const patternArray = Array.isArray(patterns) ? patterns : [patterns];

        await client.psubscribe(...patternArray);

        const pmessageHandler = (pattern: string, channel: string, message: string): void => {
            if (patternArray.includes(pattern)) {
                callback(pattern, channel, message);
            }
        };

        client.on('pmessage', pmessageHandler);
        this.logger.log(`Pattern subscribed to: ${patternArray.join(', ')}`);

        return async (): Promise<void> => {
            client.off('pmessage', pmessageHandler);
            await client.punsubscribe(...patternArray);
            this.logger.log(`Pattern unsubscribed from: ${patternArray.join(', ')}`);
        };
    }

    // ==================== Set Operations ====================

    /** @see RedisStringService.set */
    set = (key: string, value: string, clientName?: string) => this._strings.set(key, value, clientName);

    /** @see RedisSetService.add */
    setAdd = (key: string, members: string | string[], clientName?: string) => this._sets.add(key, members, clientName);

    /** @see RedisSetService.count */
    setCount = (key: string, clientName?: string) => this._sets.count(key, clientName);

    /** @see RedisSetService.difference */
    setDifference = (keys: string[], clientName?: string) => this._sets.difference(keys, clientName);

    /** @see RedisSetService.intersection */
    setIntersection = (keys: string[], clientName?: string) => this._sets.intersection(keys, clientName);

    /** @see RedisSetService.isMember */
    setIsMember = (key: string, member: string, clientName?: string) => this._sets.isMember(key, member, clientName);

    /** @see RedisStringService.setJSON */
    setJSON = (key: string, value: unknown, clientName?: string) => this._strings.setJSON(key, value, clientName);

    /** @see RedisSetService.members */
    setMembers = (key: string, clientName?: string) => this._sets.members(key, clientName);

    /** @see RedisSetService.pop */
    setPop = (key: string, clientName?: string) => this._sets.pop(key, clientName);

    /** @see RedisSetService.randomMember */
    setRandomMember = (key: string, clientName?: string) => this._sets.randomMember(key, clientName);

    // ==================== Sorted Set Operations ====================

    /** @see RedisSetService.remove */
    setRemove = (key: string, members: string | string[], clientName?: string) =>
        this._sets.remove(key, members, clientName);

    /** @see RedisSetService.union */
    setUnion = (keys: string[], clientName?: string) => this._sets.union(keys, clientName);

    /** @see RedisStringService.setWithTTL */
    setWithTTL = (key: string, value: unknown, ttlSeconds: number, clientName?: string) =>
        this._strings.setWithTTL(key, value, ttlSeconds, clientName);

    /**
     * Subscribe to Redis channel(s)
     *
     * @param {string | string[]} channels - Channel(s) to subscribe
     * @param {(channel: string, message: string) => void} callback - Message handler
     * @param {string} [clientName='default'] - Name of the Redis connection
     * @returns {Promise<() => Promise<void>>} Cleanup function
     */
    async subscribe(
        channels: string | string[],
        callback: (channel: string, message: string) => void,
        clientName: string = DEFAULT_REDIS_NAME,
    ): Promise<() => Promise<void>> {
        const client = this.getClient(clientName);
        const channelArray = Array.isArray(channels) ? channels : [channels];

        await client.subscribe(...channelArray);

        const messageHandler = (channel: string, message: string): void => {
            if (channelArray.includes(channel)) {
                callback(channel, message);
            }
        };

        client.on('message', messageHandler);
        this.logger.log(`Subscribed to channel(s): ${channelArray.join(', ')}`);

        return async (): Promise<void> => {
            client.off('message', messageHandler);
            await client.unsubscribe(...channelArray);
            this.logger.log(`Unsubscribed from channel(s): ${channelArray.join(', ')}`);
        };
    }

    /**
     * Execute commands in a transaction (atomic)
     *
     * @param {(multi: ReturnType<Redis['multi']>) => void} transactionBuilder - Transaction builder
     * @param {string} [clientName='default'] - Name of the Redis connection
     * @returns {Promise<Array<[Error | null, unknown]> | null>} Transaction results
     */
    async transaction(
        transactionBuilder: (multi: ReturnType<Redis['multi']>) => void,
        clientName: string = DEFAULT_REDIS_NAME,
    ): Promise<Array<[Error | null, unknown]> | null> {
        const client = this.getClient(clientName);

        if (client instanceof Cluster) {
            this.logger.warn('Transactions are not fully supported in cluster mode');
        }

        const multi = (client as Redis).multi();

        transactionBuilder(multi);

        return multi.exec();
    }

    /**
     * Get a remote context bound to a specific client
     *
     * @param {string} clientName - Name of the Redis connection
     * @returns {IRedisService} Context-aware Redis service
     */
    withClient(clientName: string): IRedisService {
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                // If calling withClient again, delegate to original method (switches context)
                if (prop === 'withClient') {
                    return (name: string) => this.withClient(name);
                }

                const value = Reflect.get(target, prop, receiver);

                // Only proxy functions
                if (typeof value === 'function') {
                    return (...args: unknown[]) => {
                        // Handle methods with optional middle arguments
                        const propName = String(prop);

                        // increment/decrement: (key, amount?, clientName?)
                        if (['decrement', 'increment'].includes(propName)) {
                            if (args.length === 1) {
                                return value.apply(this, [args[0], undefined, clientName]);
                            }
                        }

                        // hashIncrement: (key, field, amount?, clientName?)
                        if (propName === 'hashIncrement') {
                            if (args.length === 2) {
                                return value.apply(this, [args[0], args[1], undefined, clientName]);
                            }
                        }

                        // scanKeys/scanKeysToArray: (pattern, count?, clientName?)
                        if (['scanKeys', 'scanKeysToArray'].includes(propName)) {
                            if (args.length === 1) {
                                return value.apply(this, [args[0], undefined, clientName]);
                            }
                        }

                        // Default: append clientName to arguments
                        // Use spread to pass existing args, then append clientName
                        // If args already has clientName (user provided), this appends another one,
                        // but JS ignores extra arguments. However, we want to OVERRIDE.
                        // Implied contract: when using withClient, do not pass specific clientName to methods.
                        return value.apply(this, [...args, clientName]);
                    };
                }

                return value;
            },
        }) as unknown as IRedisService;
    }

    /** @see RedisSortedSetService.add */
    zAdd = (key: string, members: Array<{ member: string; score: number }>, clientName?: string) =>
        this._sortedSets.add(key, members, clientName);

    /** @see RedisSortedSetService.count */
    zCount = (key: string, clientName?: string) => this._sortedSets.count(key, clientName);

    /** @see RedisSortedSetService.countByScore */
    zCountByScore = (key: string, min: number, max: number, clientName?: string) =>
        this._sortedSets.countByScore(key, min, max, clientName);

    /** @see RedisSortedSetService.incrementScore */
    zIncrementScore = (key: string, member: string, amount: number, clientName?: string) =>
        this._sortedSets.incrementScore(key, member, amount, clientName);

    /** @see RedisSortedSetService.range */
    zRange = (key: string, start: number, stop: number, clientName?: string) =>
        this._sortedSets.range(key, start, stop, clientName);

    // ==================== Pub/Sub Operations ====================

    /** @see RedisSortedSetService.rangeByScore */
    zRangeByScore = (key: string, min: number, max: number, clientName?: string) =>
        this._sortedSets.rangeByScore(key, min, max, clientName);

    /** @see RedisSortedSetService.rangeReverse */
    zRangeReverse = (key: string, start: number, stop: number, clientName?: string) =>
        this._sortedSets.rangeReverse(key, start, stop, clientName);

    /** @see RedisSortedSetService.rank */
    zRank = (key: string, member: string, clientName?: string) => this._sortedSets.rank(key, member, clientName);

    // ==================== Transaction/Pipeline ====================

    /** @see RedisSortedSetService.remove */
    zRemove = (key: string, members: string | string[], clientName?: string) =>
        this._sortedSets.remove(key, members, clientName);

    /** @see RedisSortedSetService.reverseRank */
    zReverseRank = (key: string, member: string, clientName?: string) =>
        this._sortedSets.reverseRank(key, member, clientName);

    /** @see RedisSortedSetService.score */
    zScore = (key: string, member: string, clientName?: string) => this._sortedSets.score(key, member, clientName);
}
