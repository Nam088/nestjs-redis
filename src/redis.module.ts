import { DynamicModule, Module } from '@nestjs/common';

import { RedisModuleAsyncOptions, RedisModuleOptions } from './interfaces/redis-options.interface';

import { RedisCoreModule } from './redis-core.module';

/**
 * Redis module for NestJS
 * Provides Redis client integration with support for multiple connections and cluster mode
 */
@Module({})
export class RedisModule {
    /**
     * Register Redis module with synchronous configuration
     *
     * @static
     * @param {RedisModuleOptions} options - Redis configuration options
     * @returns {DynamicModule} NestJS dynamic module
     *
     * @example
     * ```typescript
     * RedisModule.forRoot({
     *   host: 'localhost',
     *   port: 6379,
     *   password: 'secret',
     * })
     * ```
     */
    static forRoot(options: RedisModuleOptions): DynamicModule {
        return {
            imports: [RedisCoreModule.forRoot(options)],
            module: RedisModule,
        };
    }

    /**
     * Register Redis module with asynchronous configuration
     * Supports factory, class, and existing provider patterns
     *
     * @static
     * @param {RedisModuleAsyncOptions} options - Async configuration options
     * @returns {DynamicModule} NestJS dynamic module
     *
     * @example
     * ```typescript
     * RedisModule.forRootAsync({
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
        return {
            imports: [RedisCoreModule.forRootAsync(options)],
            module: RedisModule,
        };
    }
}
