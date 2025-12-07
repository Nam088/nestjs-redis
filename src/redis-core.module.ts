import { DynamicModule, Global, Logger, Module, Provider } from '@nestjs/common';

import Redis, { Cluster } from 'ioredis';

import { RedisService } from './services/redis.service';

import { RedisModuleAsyncOptions, RedisModuleOptions, RedisOptionsFactory } from './interfaces/redis-options.interface';

import { DEFAULT_REDIS_NAME, REDIS_CLIENT, REDIS_MODULE_OPTIONS } from './constants/redis.constants';

/**
 * Core Redis module for NestJS
 * Provides global Redis client management and configuration
 */
@Global()
@Module({})
export class RedisCoreModule {
    private static readonly logger = new Logger(RedisCoreModule.name);

    /**
     * Register module with synchronous configuration
     *
     * @static
     * @param {RedisModuleOptions} options - Redis configuration options
     * @returns {DynamicModule} NestJS dynamic module
     *
     * @example
     * ```typescript
     * RedisCoreModule.forRoot({
     *   host: 'localhost',
     *   port: 6379,
     *   password: 'secret'
     * })
     * ```
     */
    static forRoot(options: RedisModuleOptions): DynamicModule {
        this.validateOptions(options);
        const redisProvider = this.createRedisProvider(options);

        return {
            providers: [RedisService, redisProvider],
            exports: [RedisService, redisProvider],
            global: true,
            module: RedisCoreModule,
        };
    }

    /**
     * Register module with asynchronous configuration
     * Supports factory, class, and existing provider patterns
     *
     * @static
     * @param {RedisModuleAsyncOptions} options - Async configuration options
     * @returns {DynamicModule} NestJS dynamic module
     *
     * @example
     * ```typescript
     * RedisCoreModule.forRootAsync({
     *   imports: [ConfigModule],
     *   useFactory: (configService: ConfigService) => ({
     *     host: configService.get('REDIS_HOST'),
     *     port: configService.get('REDIS_PORT'),
     *   }),
     *   inject: [ConfigService],
     * })
     * ```
     */
    static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
        const asyncProviders = this.createAsyncProviders(options);
        const asyncClientProvider = this.createAsyncClientProvider(options);

        return {
            imports: options.imports || [],
            providers: [RedisService, ...asyncProviders, asyncClientProvider],
            exports: [RedisService, asyncClientProvider],
            global: true,
            module: RedisCoreModule,
        };
    }

    /**
     * Create async client provider
     * Creates Redis client using async configuration
     *
     * @private
     * @static
     * @param {RedisModuleAsyncOptions} options - Async configuration options
     * @returns {Provider} NestJS provider configuration
     */
    private static createAsyncClientProvider(options: RedisModuleAsyncOptions): Provider {
        const clientName = options.name || DEFAULT_REDIS_NAME;

        return {
            inject: [REDIS_MODULE_OPTIONS, RedisService],
            provide: `${REDIS_CLIENT}_${clientName}`,
            useFactory: (redisOptions: RedisModuleOptions, redisService: RedisService) => {
                this.validateOptions(redisOptions);

                const client = RedisCoreModule.createRedisClient({
                    ...redisOptions,
                    name: clientName,
                });

                this.setupClientEventHandlers(client, clientName);
                redisService.addClient(clientName, client);

                return client;
            },
        };
    }

    /**
     * Create async providers for Redis options
     * Supports useFactory, useClass, and useExisting patterns
     *
     * @private
     * @static
     * @param {RedisModuleAsyncOptions} options - Async configuration options
     * @returns {Provider[]} Array of NestJS providers
     */
    private static createAsyncProviders(options: RedisModuleAsyncOptions): Provider[] {
        if (options.useFactory) {
            return [
                {
                    inject: options.inject ?? [],
                    provide: REDIS_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                },
            ];
        }

        if (options.useClass) {
            return [
                {
                    provide: options.useClass,
                    useClass: options.useClass,
                },
                {
                    inject: [options.useClass],
                    provide: REDIS_MODULE_OPTIONS,
                    useFactory: async (optionsFactory: RedisOptionsFactory) =>
                        await optionsFactory.createRedisOptions(),
                },
            ];
        }

        if (options.useExisting) {
            return [
                {
                    inject: [options.useExisting],
                    provide: REDIS_MODULE_OPTIONS,
                    useFactory: async (optionsFactory: RedisOptionsFactory) =>
                        await optionsFactory.createRedisOptions(),
                },
            ];
        }

        return [];
    }

    /**
     * Create a Redis client from options
     * Supports both standalone and cluster mode
     * Includes default retry strategy for better reliability
     *
     * @private
     * @static
     * @param {RedisModuleOptions} options - Redis configuration options
     * @returns {Redis | Cluster} Redis or Cluster client instance
     */
    private static createRedisClient(options: RedisModuleOptions): Cluster | Redis {
        // Default retry strategy with exponential backoff
        const defaultRetryStrategy = (times: number): null | number => {
            if (times > 10) {
                RedisCoreModule.logger.error(`Redis connection failed after ${times} attempts. Stopping retries.`);

                return null;
            }

            const delay = Math.min(times * 100, 3000);

            RedisCoreModule.logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms...`);

            return delay;
        };

        const mergedOptions = {
            retryStrategy: defaultRetryStrategy,
            ...options,
        };

        if (options.isCluster && options.clusterNodes) {
            return new Cluster(options.clusterNodes, mergedOptions);
        }

        return new Redis(mergedOptions);
    }

    /**
     * Create a provider for Redis client
     * Sets up event listeners and registers the client with RedisService
     *
     * @private
     * @static
     * @param {RedisModuleOptions} options - Redis configuration options
     * @returns {Provider} NestJS provider configuration
     */
    private static createRedisProvider(options: RedisModuleOptions): Provider {
        const clientName = options.name || DEFAULT_REDIS_NAME;

        return {
            inject: [RedisService],
            provide: `${REDIS_CLIENT}_${clientName}`,
            useFactory: (redisService: RedisService) => {
                const client = RedisCoreModule.createRedisClient(options);

                this.setupClientEventHandlers(client, clientName);
                redisService.addClient(clientName, client);

                return client;
            },
        };
    }

    /**
     * Setup event handlers for Redis client
     * Centralizes all event listener logic to avoid duplication
     *
     * @private
     * @static
     * @param {Redis | Cluster} client - Redis or Cluster client instance
     * @param {string} clientName - Name identifier for the client
     */
    private static setupClientEventHandlers(client: Cluster | Redis, clientName: string): void {
        client.on('error', (err: Error) => {
            RedisCoreModule.logger.error(`Redis client "${clientName}" error:`, err.stack);
        });

        client.on('connect', () => {
            RedisCoreModule.logger.log(`Redis client "${clientName}" connected`);
        });

        client.on('ready', () => {
            RedisCoreModule.logger.log(`Redis client "${clientName}" ready`);
        });

        client.on('close', () => {
            RedisCoreModule.logger.warn(`Redis client "${clientName}" connection closed`);
        });

        client.on('reconnecting', () => {
            RedisCoreModule.logger.log(`Redis client "${clientName}" reconnecting...`);
        });
    }

    /**
     * Validate Redis module options
     * Throws an error if options are invalid
     *
     * @private
     * @static
     * @param {RedisModuleOptions} options - Redis configuration options
     * @throws {Error} If options are invalid
     */
    private static validateOptions(options: RedisModuleOptions): void {
        if (options.isCluster) {
            if (!options.clusterNodes || options.clusterNodes.length === 0) {
                throw new Error(
                    'Redis cluster mode requires at least one cluster node. ' +
                        'Please provide clusterNodes array with {host, port} objects.',
                );
            }
        }

        if (options.port !== undefined && (options.port < 0 || options.port > 65535)) {
            throw new Error(`Invalid Redis port: ${options.port}. Port must be between 0 and 65535.`);
        }
    }
}
