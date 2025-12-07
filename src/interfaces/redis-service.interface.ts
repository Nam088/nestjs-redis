import type { Cluster, Redis } from 'ioredis';

/**
 * Redis Base Operations Interface
 * Core client management and key operations
 */
export interface IRedisBaseOperations {
    addClient: (name: string, client: Cluster | Redis) => void;
    client: Cluster | Redis;
    delete: (keys: string | string[], clientName?: string) => Promise<number>;
    exists: (key: string, clientName?: string) => Promise<boolean>;
    expire: (key: string, seconds: number, clientName?: string) => Promise<number>;
    flushDB: (clientName?: string) => Promise<'OK'>;
    getClient: (name?: string) => Cluster | Redis;
    getClients: () => Map<string, Cluster | Redis>;
    getTTL: (key: string, clientName?: string) => Promise<number>;
    keys: (pattern: string, clientName?: string) => Promise<string[]>;
    persist: (key: string, clientName?: string) => Promise<number>;
    removeClient: (name: string) => Promise<boolean>;
    rename: (oldKey: string, newKey: string, clientName?: string) => Promise<'OK'>;
    scanKeys: (pattern: string, count?: number, clientName?: string) => AsyncGenerator<string>;
    scanKeysToArray: (pattern: string, count?: number, clientName?: string) => Promise<string[]>;
    type: (key: string, clientName?: string) => Promise<string>;
}

/**
 * Redis Hash Operations Interface
 */
export interface IRedisHashOperations {
    delete: (key: string, fields: string | string[], clientName?: string) => Promise<number>;
    exists: (key: string, field: string, clientName?: string) => Promise<boolean>;
    get: (key: string, field: string, clientName?: string) => Promise<null | string>;
    getAll: (key: string, clientName?: string) => Promise<Record<string, string>>;
    increment: (key: string, field: string, amount?: number, clientName?: string) => Promise<number>;
    keys: (key: string, clientName?: string) => Promise<string[]>;
    length: (key: string, clientName?: string) => Promise<number>;
    mget: (key: string, fields: string[], clientName?: string) => Promise<Array<null | string>>;
    set: (key: string, fieldValues: Record<string, string>, clientName?: string) => Promise<number>;
}

/**
 * Redis List Operations Interface
 */
export interface IRedisListOperations {
    index: (key: string, index: number, clientName?: string) => Promise<null | string>;
    length: (key: string, clientName?: string) => Promise<number>;
    popLeft: (key: string, clientName?: string) => Promise<null | string>;
    popRight: (key: string, clientName?: string) => Promise<null | string>;
    pushLeft: (key: string, values: string | string[], clientName?: string) => Promise<number>;
    pushRight: (key: string, values: string | string[], clientName?: string) => Promise<number>;
    range: (key: string, start: number, stop: number, clientName?: string) => Promise<string[]>;
    setByIndex: (key: string, index: number, value: string, clientName?: string) => Promise<'OK'>;
    trim: (key: string, start: number, stop: number, clientName?: string) => Promise<'OK'>;
}

/**
 * Redis Pub/Sub Operations Interface
 */
export interface IRedisPubSubOperations {
    psubscribe: (
        patterns: string | string[],
        callback: (pattern: string, channel: string, message: string) => void,
        clientName?: string,
    ) => Promise<() => Promise<void>>;
    publish: (channel: string, message: string, clientName?: string) => Promise<number>;
    subscribe: (
        channels: string | string[],
        callback: (channel: string, message: string) => void,
        clientName?: string,
    ) => Promise<() => Promise<void>>;
}

/**
 * Complete Redis Service Interface
 * Extends base, string, and pub/sub operations directly.
 * Hash, List, Set, SortedSet operations use prefixed names to avoid collision.
 */
export interface IRedisService extends IRedisBaseOperations, IRedisPubSubOperations, IRedisStringOperations {
    // Hash operations (prefixed)
    hashDelete: (key: string, fields: string | string[], clientName?: string) => Promise<number>;
    hashExists: (key: string, field: string, clientName?: string) => Promise<boolean>;
    hashGet: (key: string, field: string, clientName?: string) => Promise<null | string>;
    hashGetAll: (key: string, clientName?: string) => Promise<Record<string, string>>;
    hashIncrement: (key: string, field: string, amount?: number, clientName?: string) => Promise<number>;
    hashKeys: (key: string, clientName?: string) => Promise<string[]>;
    hashLength: (key: string, clientName?: string) => Promise<number>;
    hashMget: (key: string, fields: string[], clientName?: string) => Promise<Array<null | string>>;
    hashSet: (key: string, fieldValues: Record<string, string>, clientName?: string) => Promise<number>;

    // List operations (prefixed)
    listIndex: (key: string, index: number, clientName?: string) => Promise<null | string>;
    listLength: (key: string, clientName?: string) => Promise<number>;
    listPopLeft: (key: string, clientName?: string) => Promise<null | string>;
    listPopRight: (key: string, clientName?: string) => Promise<null | string>;
    listPushLeft: (key: string, values: string | string[], clientName?: string) => Promise<number>;
    listPushRight: (key: string, values: string | string[], clientName?: string) => Promise<number>;
    listRange: (key: string, start: number, stop: number, clientName?: string) => Promise<string[]>;
    listSetByIndex: (key: string, index: number, value: string, clientName?: string) => Promise<'OK'>;
    listTrim: (key: string, start: number, stop: number, clientName?: string) => Promise<'OK'>;

    // Transaction/Pipeline
    pipeline: (
        pipelineBuilder: (pipeline: ReturnType<Redis['pipeline']>) => void,
        clientName?: string,
    ) => Promise<Array<[Error | null, unknown]> | null>;
    // Set operations (prefixed)
    setAdd: (key: string, members: string | string[], clientName?: string) => Promise<number>;
    setCount: (key: string, clientName?: string) => Promise<number>;
    setDifference: (keys: string[], clientName?: string) => Promise<string[]>;
    setIntersection: (keys: string[], clientName?: string) => Promise<string[]>;
    setIsMember: (key: string, member: string, clientName?: string) => Promise<boolean>;
    setMembers: (key: string, clientName?: string) => Promise<string[]>;
    setPop: (key: string, clientName?: string) => Promise<null | string>;
    setRandomMember: (key: string, clientName?: string) => Promise<null | string>;
    setRemove: (key: string, members: string | string[], clientName?: string) => Promise<number>;

    setUnion: (keys: string[], clientName?: string) => Promise<string[]>;
    transaction: (
        transactionBuilder: (multi: ReturnType<Redis['multi']>) => void,
        clientName?: string,
    ) => Promise<Array<[Error | null, unknown]> | null>;
    /**
     * Get a remote context bound to a specific client
     * All operations on the returned object will use the specified client by default
     */
    withClient: (clientName: string) => IRedisService;
    // Sorted set operations (z-prefix)
    zAdd: (key: string, members: Array<{ member: string; score: number }>, clientName?: string) => Promise<number>;
    zCount: (key: string, clientName?: string) => Promise<number>;
    zCountByScore: (key: string, min: number, max: number, clientName?: string) => Promise<number>;
    zIncrementScore: (key: string, member: string, amount: number, clientName?: string) => Promise<string>;
    zRange: (key: string, start: number, stop: number, clientName?: string) => Promise<string[]>;
    zRangeByScore: (key: string, min: number, max: number, clientName?: string) => Promise<string[]>;
    zRangeReverse: (key: string, start: number, stop: number, clientName?: string) => Promise<string[]>;
    zRank: (key: string, member: string, clientName?: string) => Promise<null | number>;

    zRemove: (key: string, members: string | string[], clientName?: string) => Promise<number>;
    zReverseRank: (key: string, member: string, clientName?: string) => Promise<null | number>;

    zScore: (key: string, member: string, clientName?: string) => Promise<null | string>;
}

/**
 * Redis Set Operations Interface
 */
export interface IRedisSetOperations {
    add: (key: string, members: string | string[], clientName?: string) => Promise<number>;
    count: (key: string, clientName?: string) => Promise<number>;
    difference: (keys: string[], clientName?: string) => Promise<string[]>;
    intersection: (keys: string[], clientName?: string) => Promise<string[]>;
    isMember: (key: string, member: string, clientName?: string) => Promise<boolean>;
    members: (key: string, clientName?: string) => Promise<string[]>;
    pop: (key: string, clientName?: string) => Promise<null | string>;
    randomMember: (key: string, clientName?: string) => Promise<null | string>;
    remove: (key: string, members: string | string[], clientName?: string) => Promise<number>;
    union: (keys: string[], clientName?: string) => Promise<string[]>;
}

/**
 * Redis Sorted Set Operations Interface
 */
export interface IRedisSortedSetOperations {
    add: (key: string, members: Array<{ member: string; score: number }>, clientName?: string) => Promise<number>;
    count: (key: string, clientName?: string) => Promise<number>;
    countByScore: (key: string, min: number, max: number, clientName?: string) => Promise<number>;
    incrementScore: (key: string, member: string, amount: number, clientName?: string) => Promise<string>;
    range: (key: string, start: number, stop: number, clientName?: string) => Promise<string[]>;
    rangeByScore: (key: string, min: number, max: number, clientName?: string) => Promise<string[]>;
    rangeReverse: (key: string, start: number, stop: number, clientName?: string) => Promise<string[]>;
    rank: (key: string, member: string, clientName?: string) => Promise<null | number>;
    remove: (key: string, members: string | string[], clientName?: string) => Promise<number>;
    reverseRank: (key: string, member: string, clientName?: string) => Promise<null | number>;
    score: (key: string, member: string, clientName?: string) => Promise<null | string>;
}

/**
 * Redis String Operations Interface
 */
export interface IRedisStringOperations {
    decrement: (key: string, amount?: number, clientName?: string) => Promise<number>;
    get: (key: string, clientName?: string) => Promise<null | string>;
    getJSON: <T = unknown>(key: string, clientName?: string) => Promise<null | T>;
    getJSONValidated: <T>(key: string, validator: (value: unknown) => T, clientName?: string) => Promise<null | T>;
    increment: (key: string, amount?: number, clientName?: string) => Promise<number>;
    mget: (keys: string[], clientName?: string) => Promise<Array<null | string>>;
    mset: (keyValues: Record<string, string>, clientName?: string) => Promise<'OK'>;
    set: (key: string, value: string, clientName?: string) => Promise<'OK'>;
    setJSON: (key: string, value: unknown, clientName?: string) => Promise<'OK'>;
    setWithTTL: (key: string, value: unknown, ttlSeconds: number, clientName?: string) => Promise<'OK'>;
}
