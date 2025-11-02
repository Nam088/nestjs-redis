/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { DynamicModule } from '@nestjs/common';

import type { RedisModuleAsyncOptions, RedisModuleOptions } from './interfaces/redis-options.interface';

import { RedisCoreModule } from './redis-core.module';
import { RedisModule } from './redis.module';

// Mock RedisCoreModule
jest.mock('./redis-core.module');

describe('RedisModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('forRoot', () => {
        it('should call RedisCoreModule.forRoot with options', () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                port: 6379,
            };

            const mockDynamicModule: DynamicModule = {
                providers: [],
                exports: [],
                global: true,
                module: RedisCoreModule,
            };

            (RedisCoreModule.forRoot as jest.Mock).mockReturnValue(mockDynamicModule);

            const result = RedisModule.forRoot(options);

            expect(RedisCoreModule.forRoot).toHaveBeenCalledWith(options);
            expect(result.module).toBe(RedisModule);
        });

        it('should pass through all options', () => {
            const options: RedisModuleOptions = {
                name: 'custom',
                db: 1,
                host: 'redis-host',
                password: 'secret',
                port: 6380,
            };

            RedisModule.forRoot(options);

            expect(RedisCoreModule.forRoot).toHaveBeenCalledWith(options);
        });

        it('should handle cluster options', () => {
            const options: RedisModuleOptions = {
                clusterNodes: [
                    { host: 'localhost', port: 7000 },
                    { host: 'localhost', port: 7001 },
                ],
                isCluster: true,
            };

            RedisModule.forRoot(options);

            expect(RedisCoreModule.forRoot).toHaveBeenCalledWith(options);
        });
    });

    describe('forRootAsync', () => {
        it('should call RedisCoreModule.forRootAsync with options', () => {
            const asyncOptions: RedisModuleAsyncOptions = {
                useFactory: () => ({
                    host: 'localhost',
                    port: 6379,
                }),
            };

            const mockDynamicModule: DynamicModule = {
                providers: [],
                exports: [],
                global: true,
                module: RedisCoreModule,
            };

            (RedisCoreModule.forRootAsync as jest.Mock).mockReturnValue(mockDynamicModule);

            const result = RedisModule.forRootAsync(asyncOptions);

            expect(RedisCoreModule.forRootAsync).toHaveBeenCalledWith(asyncOptions);
            expect(result.module).toBe(RedisModule);
        });

        it('should pass through useFactory options', () => {
            const factory = jest.fn(() => ({
                host: 'localhost',
                port: 6379,
            }));

            const asyncOptions: RedisModuleAsyncOptions = {
                inject: ['ConfigService'],
                useFactory: factory,
            };

            RedisModule.forRootAsync(asyncOptions);

            expect(RedisCoreModule.forRootAsync).toHaveBeenCalledWith(asyncOptions);
        });

        it('should handle async options with imports', () => {
            const asyncOptions: RedisModuleAsyncOptions = {
                imports: [
                    {
                        global: true,
                        module: class ConfigModule {},
                    },
                ],
                inject: ['ConfigService'],
                useFactory: (config: any) => ({
                    host: config.host,
                    port: config.port,
                }),
            };

            RedisModule.forRootAsync(asyncOptions);

            expect(RedisCoreModule.forRootAsync).toHaveBeenCalledWith(asyncOptions);
        });

        it('should handle custom name in async options', () => {
            const asyncOptions: RedisModuleAsyncOptions = {
                name: 'async-connection',
                useFactory: () => ({
                    host: 'localhost',
                    port: 6379,
                }),
            };

            RedisModule.forRootAsync(asyncOptions);

            expect(RedisCoreModule.forRootAsync).toHaveBeenCalledWith(asyncOptions);
        });
    });

    describe('Module Type', () => {
        it('should be a module class', () => {
            expect(RedisModule).toBeDefined();
            expect(typeof RedisModule).toBe('function');
        });

        it('should have static forRoot method', () => {
            expect(RedisModule.forRoot).toBeDefined();
            expect(typeof RedisModule.forRoot).toBe('function');
        });

        it('should have static forRootAsync method', () => {
            expect(RedisModule.forRootAsync).toBeDefined();
            expect(typeof RedisModule.forRootAsync).toBe('function');
        });
    });
});
