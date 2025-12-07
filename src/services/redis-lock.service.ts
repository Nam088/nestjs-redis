import { Injectable, Logger } from '@nestjs/common';

import Redis, { Cluster } from 'ioredis';

import { RedisService } from './redis.service';

/**
 * Options for acquiring a distributed lock
 */
export interface LockOptions {
    /**
     * Name of the Redis connection to use
     * @default 'default'
     */
    clientName?: string;

    /**
     * Number of retry attempts to acquire the lock
     * @default 3
     */
    retryCount?: number;

    /**
     * Delay between retry attempts in milliseconds
     * @default 200
     */
    retryDelayMs?: number;

    /**
     * Time to live for the lock in milliseconds
     * After this time, the lock will be automatically released
     * @default 10000
     */
    ttlMs?: number;
}

/**
 * Result of a successful lock acquisition
 */
export interface LockResult {
    /**
     * Extend the lock TTL
     * @param ttlMs - New TTL in milliseconds
     * @returns Promise that resolves to true if extended, false if lock expired
     */
    extend: (ttlMs: number) => Promise<boolean>;

    /**
     * The key that was locked
     */
    key: string;

    /**
     * Unique identifier for this lock instance
     */
    lockId: string;

    /**
     * Release the lock
     * @returns Promise that resolves to true if lock was released, false if already expired
     */
    release: () => Promise<boolean>;
}

/**
 * Lua script for atomic lock release
 * Only releases if the lock value matches (prevents releasing someone else's lock)
 */
const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

/**
 * Lua script for atomic lock extension
 * Only extends if the lock value matches
 */
const EXTEND_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
else
    return 0
end
`;

/**
 * Distributed Lock Service using Redis
 *
 * Provides distributed locking capabilities using Redis SET NX with automatic expiration.
 * This is a simplified implementation suitable for single Redis instance.
 * For Redis Cluster with high availability requirements, consider using the Redlock algorithm.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const lock = await lockService.acquire('resource:123');
 * if (lock) {
 *   try {
 *     // Do exclusive work
 *   } finally {
 *     await lock.release();
 *   }
 * }
 *
 * // Using withLock helper
 * const result = await lockService.withLock('resource:123', async () => {
 *   // This code runs with the lock held
 *   return computeResult();
 * });
 * ```
 */
@Injectable()
export class RedisLockService {
    private readonly lockPrefix = 'lock:';
    private readonly logger = new Logger(RedisLockService.name);

    constructor(private readonly redisService: RedisService) {}

    /**
     * Get the remaining TTL of a lock in milliseconds
     *
     * @param {string} key - The resource key to check
     * @param {string} [clientName='default'] - Name of the Redis connection
     * @returns {Promise<number>} TTL in milliseconds, -1 if no expiry, -2 if key doesn't exist
     */
    async getLockTTL(key: string, clientName: string = 'default'): Promise<number> {
        const lockKey = this.lockPrefix + key;
        const client = this.redisService.getClient(clientName);

        return client.pttl(lockKey);
    }

    /**
     * Attempt to acquire a distributed lock
     *
     * @param {string} key - The resource key to lock (will be prefixed with 'lock:')
     * @param {LockOptions} [options] - Lock options
     * @returns {Promise<LockResult | null>} LockResult if acquired, null if lock is held by another process
     *
     * @example
     * ```typescript
     * const lock = await lockService.acquire('user:123:update', {
     *   ttlMs: 5000,
     *   retryCount: 5,
     *   retryDelayMs: 100,
     * });
     *
     * if (!lock) {
     *   throw new Error('Could not acquire lock');
     * }
     *
     * try {
     *   await updateUser(123);
     * } finally {
     *   await lock.release();
     * }
     * ```
     */
    async acquire(key: string, options: LockOptions = {}): Promise<LockResult | null> {
        const { clientName = 'default', retryCount = 3, retryDelayMs = 200, ttlMs = 10000 } = options;

        const lockKey = this.lockPrefix + key;
        const lockId = this.generateLockId();
        const client = this.redisService.getClient(clientName);

        for (let attempt = 0; attempt <= retryCount; attempt++) {
            const acquired = await this.tryAcquire(client, lockKey, lockId, ttlMs);

            if (acquired) {
                this.logger.debug(`Lock acquired: ${lockKey} (id: ${lockId})`);

                return {
                    extend: (newTtlMs: number) => this.extend(client, lockKey, lockId, newTtlMs),
                    key: lockKey,
                    release: () => this.release(client, lockKey, lockId),
                    lockId,
                };
            }

            if (attempt < retryCount) {
                await this.delay(retryDelayMs);
            }
        }

        this.logger.debug(`Failed to acquire lock: ${lockKey} after ${retryCount + 1} attempts`);

        return null;
    }

    /**
     * Force release a lock (use with caution!)
     * This will release the lock regardless of who owns it.
     *
     * @param {string} key - The resource key to unlock
     * @param {string} [clientName='default'] - Name of the Redis connection
     * @returns {Promise<boolean>} true if lock existed and was removed
     */
    async forceRelease(key: string, clientName: string = 'default'): Promise<boolean> {
        const lockKey = this.lockPrefix + key;
        const client = this.redisService.getClient(clientName);
        const result = await client.del(lockKey);

        if (result > 0) {
            this.logger.warn(`Lock force released: ${lockKey}`);

            return true;
        }

        return false;
    }

    /**
     * Check if a resource is currently locked
     *
     * @param {string} key - The resource key to check
     * @param {string} [clientName='default'] - Name of the Redis connection
     * @returns {Promise<boolean>} true if locked, false otherwise
     */
    async isLocked(key: string, clientName: string = 'default'): Promise<boolean> {
        const lockKey = this.lockPrefix + key;
        const client = this.redisService.getClient(clientName);
        const value = await client.get(lockKey);

        return value !== null;
    }

    /**
     * Execute a function while holding a lock
     *
     * This is a convenience method that handles lock acquisition, execution, and release.
     * If the lock cannot be acquired, it throws an error.
     *
     * @template T
     * @param {string} key - The resource key to lock
     * @param {() => Promise<T>} fn - Function to execute while holding the lock
     * @param {LockOptions} [options] - Lock options
     * @returns {Promise<T>} The result of the function
     * @throws {Error} If lock cannot be acquired
     *
     * @example
     * ```typescript
     * const result = await lockService.withLock(
     *   'inventory:item:123',
     *   async () => {
     *     const item = await getItem(123);
     *     item.quantity -= 1;
     *     await saveItem(item);
     *     return item;
     *   },
     *   { ttlMs: 5000 }
     * );
     * ```
     */
    async withLock<T>(key: string, fn: () => Promise<T>, options: LockOptions = {}): Promise<T> {
        const lock = await this.acquire(key, options);

        if (!lock) {
            throw new Error(`Failed to acquire lock for key: ${key}`);
        }

        try {
            return await fn();
        } finally {
            await lock.release();
        }
    }

    /**
     * Delay helper
     * @private
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Extend lock TTL using Lua script for atomicity
     * @private
     */
    private async extend(client: Cluster | Redis, lockKey: string, lockId: string, ttlMs: number): Promise<boolean> {
        try {
            const result = await (client as Redis).eval(EXTEND_LOCK_SCRIPT, 1, lockKey, lockId, ttlMs);

            if (result === 1) {
                this.logger.debug(`Lock extended: ${lockKey} (new TTL: ${ttlMs}ms)`);

                return true;
            }

            this.logger.debug(`Lock already expired or owned by another: ${lockKey}`);

            return false;
        } catch (error) {
            this.logger.error(`Error extending lock ${lockKey}:`, error);

            return false;
        }
    }

    /**
     * Generate unique lock identifier
     * @private
     */
    private generateLockId(): string {
        return `${process.pid}:${Date.now()}:${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Release lock using Lua script for atomicity
     * @private
     */
    private async release(client: Cluster | Redis, lockKey: string, lockId: string): Promise<boolean> {
        try {
            const result = await (client as Redis).eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockId);

            if (result === 1) {
                this.logger.debug(`Lock released: ${lockKey}`);

                return true;
            }

            this.logger.debug(`Lock already expired or owned by another: ${lockKey}`);

            return false;
        } catch (error) {
            this.logger.error(`Error releasing lock ${lockKey}:`, error);

            return false;
        }
    }

    /**
     * Try to acquire lock using SET NX PX
     * @private
     */
    private async tryAcquire(
        client: Cluster | Redis,
        lockKey: string,
        lockId: string,
        ttlMs: number,
    ): Promise<boolean> {
        // SET key value NX PX milliseconds
        const result = await client.set(lockKey, lockId, 'PX', ttlMs, 'NX');

        return result === 'OK';
    }
}
