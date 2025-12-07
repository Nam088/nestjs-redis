import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import Redis, { Cluster } from 'ioredis';

import { DEFAULT_REDIS_NAME } from '../constants/redis.constants';
import { RedisClientNotFoundError, RedisTimeoutError } from '../errors/redis.errors';

import type { IRedisBaseOperations } from '../interfaces/redis-service.interface';

/**
 * Default timeout for graceful shutdown in milliseconds
 */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

/**
 * Base Redis Service for client management
 *
 * This service provides core functionality for managing Redis connections.
 * Other domain-specific services should inject this service to access Redis clients.
 */
@Injectable()
export class RedisBaseService implements IRedisBaseOperations, OnModuleDestroy {
    /**
     * Get the default Redis client for direct ioredis API access
     *
     * @returns {Redis | Cluster} The default Redis client instance
     * @throws {RedisClientNotFoundError} If default client is not found
     *
     * @example
     * ```typescript
     * // Direct ioredis API access
     * await redis.client.set('key', 'value', 'EX', 300, 'NX');
     * await redis.client.eval('return KEYS[1]', 1, 'mykey');
     * ```
     */
    get client(): Cluster | Redis {
        return this.getClient(DEFAULT_REDIS_NAME);
    }

    protected readonly clients = new Map<string, Cluster | Redis>();

    protected readonly logger = new Logger(RedisBaseService.name);

    /**
     * Close all Redis connections when module is destroyed
     * Implements OnModuleDestroy lifecycle hook with graceful timeout
     *
     * @returns {Promise<void>}
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.log('Closing all Redis connections...');

        const closePromises = Promise.all(
            Array.from(this.clients.values()).map((client) =>
                client.quit().catch((err: Error) => {
                    this.logger.error(`Error closing Redis connection: ${err.message}`);
                }),
            ),
        );

        const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(
                () => reject(new RedisTimeoutError('shutdown', DEFAULT_SHUTDOWN_TIMEOUT_MS)),
                DEFAULT_SHUTDOWN_TIMEOUT_MS,
            );
        });

        try {
            await Promise.race([closePromises, timeoutPromise]);
        } catch (err) {
            if (err instanceof RedisTimeoutError) {
                this.logger.warn(
                    `Graceful shutdown timed out after ${DEFAULT_SHUTDOWN_TIMEOUT_MS}ms, forcing close...`,
                );
            } else {
                throw err;
            }
        }

        this.clients.clear();
        this.logger.log('All Redis connections closed');
    }

    /**
     * Add a Redis client to the service
     *
     * @param {string} name - Name identifier for the client
     * @param {Redis | Cluster} client - Redis or Cluster client instance
     * @returns {void}
     */
    addClient(name: string, client: Cluster | Redis): void {
        this.clients.set(name, client);
    }

    /**
     * Check if a key exists
     *
     * @param {string} key - Redis key to check
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<boolean>} True if key exists, false otherwise
     */
    async exists(key: string, clientName: string = DEFAULT_REDIS_NAME): Promise<boolean> {
        const client = this.getClient(clientName);
        const result = await client.exists(key);

        return result === 1;
    }

    /**
     * Get a Redis client by name
     *
     * @param {string} [name='default'] - Name of the Redis connection
     * @returns {Redis | Cluster} Redis or Cluster client instance
     * @throws {RedisClientNotFoundError} If client with the specified name is not found
     */
    getClient(name: string = DEFAULT_REDIS_NAME): Cluster | Redis {
        const client = this.clients.get(name);

        if (!client) {
            throw new RedisClientNotFoundError(name);
        }

        return client;
    }

    /**
     * Get all Redis clients
     *
     * @returns {Map<string, Redis | Cluster>} Map of all Redis clients
     */
    getClients(): Map<string, Cluster | Redis> {
        return this.clients;
    }

    /**
     * Get the TTL (time to live) of a key
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} TTL in seconds, -1 if key has no expiry, -2 if key doesn't exist
     */
    async getTTL(key: string, clientName: string = DEFAULT_REDIS_NAME): Promise<number> {
        const client = this.getClient(clientName);

        return client.ttl(key);
    }

    /**
     * Delete one or more keys
     *
     * @param {string | string[]} keys - Single key or array of keys to delete
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of keys that were removed
     */
    async delete(keys: string | string[], clientName: string = DEFAULT_REDIS_NAME): Promise<number> {
        const client = this.getClient(clientName);
        const keyArray = Array.isArray(keys) ? keys : [keys];

        return client.del(...keyArray);
    }

    /**
     * Remove a Redis client from the service and close its connection
     *
     * @param {string} name - Name identifier for the client to remove
     * @returns {Promise<boolean>} True if client was found and removed, false otherwise
     */
    async removeClient(name: string): Promise<boolean> {
        const client = this.clients.get(name);

        if (!client) {
            this.logger.warn(`Redis client "${name}" not found, nothing to remove`);

            return false;
        }

        try {
            await client.quit();
            this.clients.delete(name);
            this.logger.log(`Redis client "${name}" removed successfully`);

            return true;
        } catch (err) {
            const error = err as Error;

            this.logger.error(`Error removing Redis client "${name}": ${error.message}`);
            // Still remove from map even if quit fails
            this.clients.delete(name);

            return true;
        }
    }

    /**
     * Set expiration time for a key
     *
     * @param {string} key - Redis key
     * @param {number} seconds - Expiration time in seconds
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} 1 if timeout was set, 0 if key doesn't exist
     */
    async expire(key: string, seconds: number, clientName: string = DEFAULT_REDIS_NAME): Promise<number> {
        const client = this.getClient(clientName);

        return client.expire(key, seconds);
    }

    /**
     * Flush all keys in the current database
     * WARNING: This will delete all keys in the database
     *
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     */
    async flushDB(clientName: string = DEFAULT_REDIS_NAME): Promise<'OK'> {
        const client = this.getClient(clientName);

        return client.flushdb();
    }

    /**
     * Get all keys matching a pattern
     *
     * @deprecated This command is O(N) and can block Redis on large databases.
     * Use {@link scanKeysToArray} instead for production-safe key scanning.
     *
     * @param {string} pattern - Pattern to match (e.g., 'user:*', '*session*')
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of matching keys
     *
     * @example
     * ```typescript
     * // Instead of:
     * const keys = await redisService.keys('user:*');
     *
     * // Use:
     * const keys = await redisService.scanKeysToArray('user:*');
     * ```
     */
    async keys(pattern: string, clientName: string = DEFAULT_REDIS_NAME): Promise<string[]> {
        this.logger.warn(`keys() is deprecated and O(N). Use scanKeysToArray() instead. Pattern: ${pattern}`);
        const client = this.getClient(clientName);

        return client.keys(pattern);
    }

    /**
     * Remove expiration from a key
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} 1 if timeout was removed, 0 if key doesn't exist or has no timeout
     */
    async persist(key: string, clientName: string = DEFAULT_REDIS_NAME): Promise<number> {
        const client = this.getClient(clientName);

        return client.persist(key);
    }

    /**
     * Rename a key
     *
     * @param {string} oldKey - Current key name
     * @param {string} newKey - New key name
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     */
    async rename(oldKey: string, newKey: string, clientName: string = DEFAULT_REDIS_NAME): Promise<'OK'> {
        const client = this.getClient(clientName);

        return client.rename(oldKey, newKey);
    }

    /**
     * Scan keys matching pattern (production-safe alternative to KEYS)
     * Uses cursor-based iteration to avoid blocking the server
     *
     * @param {string} pattern - Pattern to match (e.g., 'user:*')
     * @param {number} [count=100] - Hint for number of keys per iteration
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @yields {string} Each matching key
     *
     * @example
     * ```typescript
     * for await (const key of redisService.scanKeys('user:*')) {
     *   console.log(key);
     * }
     * ```
     */
    async *scanKeys(
        pattern: string,
        count: number = 100,
        clientName: string = DEFAULT_REDIS_NAME,
    ): AsyncGenerator<string> {
        const client = this.getClient(clientName);
        let cursor = '0';

        do {
            const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', count);

            cursor = nextCursor;

            for (const key of keys) {
                yield key;
            }
        } while (cursor !== '0');
    }

    /**
     * Scan and collect all keys matching pattern
     * Convenience wrapper for scanKeys that returns an array
     *
     * @param {string} pattern - Pattern to match (e.g., 'user:*')
     * @param {number} [count=100] - Hint for number of keys per iteration
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of matching keys
     *
     * @example
     * ```typescript
     * const userKeys = await redisService.scanKeysToArray('user:*');
     * ```
     */
    async scanKeysToArray(
        pattern: string,
        count: number = 100,
        clientName: string = DEFAULT_REDIS_NAME,
    ): Promise<string[]> {
        const keys: string[] = [];

        for await (const key of this.scanKeys(pattern, count, clientName)) {
            keys.push(key);
        }

        return keys;
    }

    /**
     * Get the type of a key
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string>} Type of the key (string, list, set, zset, hash, stream, none)
     */
    async type(key: string, clientName: string = DEFAULT_REDIS_NAME): Promise<string> {
        const client = this.getClient(clientName);

        return client.type(key);
    }
}
