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
        const redisProvider = this.createRedisProvider(options);

        return {
            providers: [RedisService, redisProvider],
            exports: [RedisService, redisProvider],
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
                const client = RedisCoreModule.createRedisClient({
                    ...redisOptions,
                    name: clientName,
                });

                client.on('error', (err: Error) => {
                    RedisCoreModule.logger.error(`Redis client "${clientName}" error:`, err.stack);
                });

                client.on('connect', () => {
                    RedisCoreModule.logger.log(`Redis client "${clientName}" connected`);
                });

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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
     *
     * @private
     * @static
     * @param {RedisModuleOptions} options - Redis configuration options
     * @returns {Redis | Cluster} Redis or Cluster client instance
     */
    private static createRedisClient(options: RedisModuleOptions): Cluster | Redis {
        if (options.isCluster && options.clusterNodes) {
            return new Cluster(options.clusterNodes, options);
        }

        return new Redis(options);
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

                client.on('error', (err: Error) => {
                    RedisCoreModule.logger.error(`Redis client "${clientName}" error:`, err.stack);
                });

                client.on('connect', () => {
                    RedisCoreModule.logger.log(`Redis client "${clientName}" connected`);
                });

                redisService.addClient(clientName, client);

                return client;
            },
        };
    }
}
