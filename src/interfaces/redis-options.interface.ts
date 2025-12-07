import type { Abstract, InjectionToken, ModuleMetadata, Type } from '@nestjs/common';

import type { RedisOptions as IORedisOptions } from 'ioredis';

/**
 * Async configuration options for Redis module
 * Supports factory, class, and existing provider patterns
 */
export interface RedisModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /**
     * Dependencies to inject into the factory function
     * Supports injection tokens, class types, and abstract classes
     */
    inject?: Array<Abstract<unknown> | InjectionToken | Type<unknown>>;

    /**
     * Name of the Redis connection
     * @default 'default'
     */
    name?: string;

    /**
     * Class that implements RedisOptionsFactory
     * Will be instantiated and used to create options
     */
    useClass?: Type<RedisOptionsFactory>;

    /**
     * Existing provider that implements RedisOptionsFactory
     * Will be used to create options without instantiation
     */
    useExisting?: Type<RedisOptionsFactory>;

    /**
     * Factory function to create Redis options
     * @param args - Injected dependencies
     * @returns Redis module options or a Promise that resolves to options
     */

    useFactory?: (...args: any[]) => Promise<RedisModuleOptions> | RedisModuleOptions;
}

/**
 * Redis module configuration options
 * Extends all ioredis options with additional NestJS-specific options
 *
 * @see https://github.com/redis/ioredis#connect-to-redis for full options list
 */
export interface RedisModuleOptions extends IORedisOptions {
    /**
     * Array of cluster nodes when using cluster mode
     * Required when isCluster is true
     * @example [{ host: 'localhost', port: 7000 }, { host: 'localhost', port: 7001 }]
     */
    clusterNodes?: Array<{ host: string; port: number }>;

    /**
     * Command timeout in milliseconds
     * If a command does not return within this time, operation will be rejected
     * Inherited from ioredis
     */
    commandTimeout?: number;

    /**
     * Connection timeout in milliseconds
     * How long to wait for the initial connection
     * @default 10000
     * @see https://github.com/redis/ioredis#auto-reconnect
     */
    connectTimeout?: number;

    /**
     * Whether to enable offline queue
     * When enabled, commands will be queued when connection is not ready
     * @default true
     */
    enableOfflineQueue?: boolean;

    /**
     * Whether to enable ready check before sending commands
     * @default true
     */
    enableReadyCheck?: boolean;

    /**
     * Whether to use Redis Cluster mode
     * @default false
     */
    isCluster?: boolean;

    /**
     * Maximum number of retries per request
     * Set to null to disable retries (e.g., for BullMQ compatibility)
     * @default 20
     */
    maxRetriesPerRequest?: null | number;

    /**
     * Name of the Redis connection
     * Used to identify the connection when using multiple Redis instances
     * @default 'default'
     */
    name?: string;
}

/**
 * Factory interface for creating Redis options asynchronously
 */
export interface RedisOptionsFactory {
    /**
     * Creates Redis module options
     * @returns Redis module options or a Promise that resolves to options
     */
    createRedisOptions: () => Promise<RedisModuleOptions> | RedisModuleOptions;
}
