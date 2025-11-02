import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import Redis, { Cluster } from 'ioredis';

/**
 * Redis service for managing Redis connections and providing utility methods
 * Implements OnModuleDestroy to properly clean up connections
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly clients = new Map<string, Cluster | Redis>();
    private readonly logger = new Logger(RedisService.name);

    /**
     * Close all Redis connections when module is destroyed
     * Implements OnModuleDestroy lifecycle hook
     *
     * @returns {Promise<void>}
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.log('Closing all Redis connections...');
        const closePromises = Array.from(this.clients.values()).map((client) =>
            client.quit().catch((err: Error) => {
                this.logger.error(`Error closing Redis connection: ${err.message}`);
            }),
        );

        await Promise.all(closePromises);
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
    async exists(key: string, clientName: string = 'default'): Promise<boolean> {
        const client = this.getClient(clientName);
        const result = await client.exists(key);

        return result === 1;
    }

    /**
     * Get a Redis client by name
     *
     * @param {string} [name='default'] - Name of the Redis connection
     * @returns {Redis | Cluster} Redis or Cluster client instance
     * @throws {Error} If client with the specified name is not found
     */
    getClient(name: string = 'default'): Cluster | Redis {
        const client = this.clients.get(name);

        if (!client) {
            throw new Error(`Redis client with name "${name}" not found`);
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
     * Get a value and automatically parse JSON
     *
     * @template T - Type of the returned value
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<T | null>} Parsed value or null if key doesn't exist
     */
    async getJSON<T = unknown>(key: string, clientName: string = 'default'): Promise<null | T> {
        const client = this.getClient(clientName);
        const value = await client.get(key);

        if (!value) return null;

        try {
            return JSON.parse(value) as T;
        } catch {
            return value as unknown as T;
        }
    }

    /**
     * Get the TTL (time to live) of a key
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} TTL in seconds, -1 if key has no expiry, -2 if key doesn't exist
     */
    async getTTL(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);

        return client.ttl(key);
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
        const client = this.getClient(clientName);

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
        const client = this.getClient(clientName);
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

        return client.setex(key, ttlSeconds, serializedValue);
    }

    /**
     * Delete one or more keys
     *
     * @param {string | string[]} keys - Single key or array of keys to delete
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of keys that were removed
     */
    async delete(keys: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);
        const keyArray = Array.isArray(keys) ? keys : [keys];

        return client.del(...keyArray);
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
        const client = this.getClient(clientName);

        if (amount === 1) {
            return client.decr(key);
        }

        return client.decrby(key, amount);
    }

    /**
     * Flush all keys in the current database
     * WARNING: This will delete all keys in the database
     *
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<'OK'>} Redis OK response
     */
    async flushDB(clientName: string = 'default'): Promise<'OK'> {
        const client = this.getClient(clientName);

        return client.flushdb();
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
        const client = this.getClient(clientName);

        if (amount === 1) {
            return client.incr(key);
        }

        return client.incrby(key, amount);
    }

    /**
     * Get all keys matching a pattern
     * WARNING: This command can be expensive on large databases
     *
     * @param {string} pattern - Pattern to match (e.g., 'user:*', '*session*')
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of matching keys
     */
    async keys(pattern: string, clientName: string = 'default'): Promise<string[]> {
        const client = this.getClient(clientName);

        return client.keys(pattern);
    }
}
