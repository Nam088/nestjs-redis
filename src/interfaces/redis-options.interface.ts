/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ModuleMetadata, Type } from '@nestjs/common';

import type { RedisOptions as IORedisOptions } from 'ioredis';

/**
 * Async configuration options for Redis module
 * Supports factory, class, and existing provider patterns
 */
export interface RedisModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /**
     * Dependencies to inject into the factory function
     */
    inject?: any[];

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
 */
export interface RedisModuleOptions extends IORedisOptions {
    /**
     * Array of cluster nodes when using cluster mode
     * Required when isCluster is true
     * @example [{ host: 'localhost', port: 7000 }, { host: 'localhost', port: 7001 }]
     */
    clusterNodes?: Array<{ host: string; port: number }>;

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
     * Name of the Redis connection
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
