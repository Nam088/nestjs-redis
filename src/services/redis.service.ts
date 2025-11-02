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
     * Get the length of a list
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Length of the list
     */
    async listLength(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);

        return client.llen(key);
    }

    /**
     * Remove and get the first element in a list
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} The value of the first element, or null when key doesn't exist
     */
    async listPopLeft(key: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.getClient(clientName);

        return client.lpop(key);
    }

    /**
     * Remove and get the last element in a list
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} The value of the last element, or null when key doesn't exist
     */
    async listPopRight(key: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.getClient(clientName);

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
    async listPushLeft(key: string, values: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);
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
    async listPushRight(key: string, values: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);
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
    async listRange(key: string, start: number, stop: number, clientName: string = 'default'): Promise<string[]> {
        const client = this.getClient(clientName);

        return client.lrange(key, start, stop);
    }

    /**
     * Add one or more members to a set
     *
     * @param {string} key - Redis key
     * @param {string | string[]} members - Member(s) to add
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of members added to the set
     */
    async setAdd(key: string, members: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);
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
    async setCount(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);

        return client.scard(key);
    }

    /**
     * Check if a member exists in a set
     *
     * @param {string} key - Redis key
     * @param {string} member - Member to check
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<boolean>} True if member exists in set
     */
    async setIsMember(key: string, member: string, clientName: string = 'default'): Promise<boolean> {
        const client = this.getClient(clientName);
        const result = await client.sismember(key, member);

        return result === 1;
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
     * Get all members of a set
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of set members
     */
    async setMembers(key: string, clientName: string = 'default'): Promise<string[]> {
        const client = this.getClient(clientName);

        return client.smembers(key);
    }

    /**
     * Remove one or more members from a set
     *
     * @param {string} key - Redis key
     * @param {string | string[]} members - Member(s) to remove
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of members removed from the set
     */
    async setRemove(key: string, members: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);
        const memberArray = Array.isArray(members) ? members : [members];

        return client.srem(key, ...memberArray);
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
     * Publish a message to a channel
     *
     * @param {string} channel - Channel name
     * @param {string} message - Message to publish
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of clients that received the message
     */
    async publish(channel: string, message: string, clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);

        return client.publish(channel, message);
    }

    /**
     * Add one or more members to a sorted set, or update the score if it already exists
     *
     * @param {string} key - Redis key
     * @param {Array<{score: number, member: string}>} members - Array of score-member pairs
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of elements added to the sorted set
     */
    async sortedSetAdd(
        key: string,
        members: Array<{ member: string; score: number }>,
        clientName: string = 'default',
    ): Promise<number> {
        const client = this.getClient(clientName);
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
    async sortedSetCount(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);

        return client.zcard(key);
    }

    /**
     * Get a range of members from a sorted set by index
     *
     * @param {string} key - Redis key
     * @param {number} start - Start index (0-based)
     * @param {number} stop - Stop index (-1 means last element)
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of members in the specified range
     */
    async sortedSetRange(key: string, start: number, stop: number, clientName: string = 'default'): Promise<string[]> {
        const client = this.getClient(clientName);

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
    async sortedSetRangeByScore(
        key: string,
        min: number,
        max: number,
        clientName: string = 'default',
    ): Promise<string[]> {
        const client = this.getClient(clientName);

        return client.zrangebyscore(key, min, max);
    }

    /**
     * Remove one or more members from a sorted set
     *
     * @param {string} key - Redis key
     * @param {string | string[]} members - Member(s) to remove
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of members removed
     */
    async sortedSetRemove(key: string, members: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);
        const memberArray = Array.isArray(members) ? members : [members];

        return client.zrem(key, ...memberArray);
    }

    /**
     * Get the score of a member in a sorted set
     *
     * @param {string} key - Redis key
     * @param {string} member - Member name
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string | null>} Score of the member, or null if member doesn't exist
     */
    async sortedSetScore(key: string, member: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.getClient(clientName);

        return client.zscore(key, member);
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
     * Set expiration time for a key
     *
     * @param {string} key - Redis key
     * @param {number} seconds - Expiration time in seconds
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} 1 if timeout was set, 0 if key doesn't exist
     */
    async expire(key: string, seconds: number, clientName: string = 'default'): Promise<number> {
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
    async flushDB(clientName: string = 'default'): Promise<'OK'> {
        const client = this.getClient(clientName);

        return client.flushdb();
    }

    /**
     * Delete one or more hash fields
     *
     * @param {string} key - Redis key
     * @param {string | string[]} fields - Field(s) to delete
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of fields that were removed
     */
    async hashDelete(key: string, fields: string | string[], clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);
        const fieldArray = Array.isArray(fields) ? fields : [fields];

        return client.hdel(key, ...fieldArray);
    }

    /**
     * Check if a hash field exists
     *
     * @param {string} key - Redis key
     * @param {string} field - Field name
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<boolean>} True if field exists
     */
    async hashExists(key: string, field: string, clientName: string = 'default'): Promise<boolean> {
        const client = this.getClient(clientName);
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
    async hashGet(key: string, field: string, clientName: string = 'default'): Promise<null | string> {
        const client = this.getClient(clientName);

        return client.hget(key, field);
    }

    /**
     * Get all fields and values in a hash
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<Record<string, string>>} Object with all field-value pairs
     */
    async hashGetAll(key: string, clientName: string = 'default'): Promise<Record<string, string>> {
        const client = this.getClient(clientName);

        return client.hgetall(key);
    }

    /**
     * Get all field names in a hash
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string[]>} Array of field names
     */
    async hashKeys(key: string, clientName: string = 'default'): Promise<string[]> {
        const client = this.getClient(clientName);

        return client.hkeys(key);
    }

    /**
     * Get the number of fields in a hash
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of fields in the hash
     */
    async hashLength(key: string, clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);

        return client.hlen(key);
    }

    /**
     * Set one or more hash fields
     *
     * @param {string} key - Redis key
     * @param {Record<string, string>} fieldValues - Object with field-value pairs
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of fields that were added
     */
    async hashSet(key: string, fieldValues: Record<string, string>, clientName: string = 'default'): Promise<number> {
        const client = this.getClient(clientName);

        return client.hset(key, fieldValues);
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

    /**
     * Get multiple values at once
     *
     * @param {string[]} keys - Array of keys to get
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<Array<string | null>>} Array of values (null for non-existent keys)
     */
    async mget(keys: string[], clientName: string = 'default'): Promise<Array<null | string>> {
        const client = this.getClient(clientName);

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
        const client = this.getClient(clientName);
        const args: string[] = [];

        for (const [key, value] of Object.entries(keyValues)) {
            args.push(key, value);
        }

        return client.mset(...args);
    }

    /**
     * Remove expiration from a key
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} 1 if timeout was removed, 0 if key doesn't exist or has no timeout
     */
    async persist(key: string, clientName: string = 'default'): Promise<number> {
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
    async rename(oldKey: string, newKey: string, clientName: string = 'default'): Promise<'OK'> {
        const client = this.getClient(clientName);

        return client.rename(oldKey, newKey);
    }

    /**
     * Get the type of a key
     *
     * @param {string} key - Redis key
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<string>} Type of the key (string, list, set, zset, hash, stream, none)
     */
    async type(key: string, clientName: string = 'default'): Promise<string> {
        const client = this.getClient(clientName);

        return client.type(key);
    }
}
