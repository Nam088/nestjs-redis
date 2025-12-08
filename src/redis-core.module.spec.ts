/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines-per-function */
import type { DynamicModule } from '@nestjs/common';

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { RedisService } from './services/redis.service';

import type { RedisModuleAsyncOptions, RedisModuleOptions } from './interfaces/redis-options.interface';

import { REDIS_CLIENT } from './constants/redis.constants';

import { RedisCoreModule } from './redis-core.module';

// Mock ioredis
const mockRedisInstance = {
    on: jest.fn().mockReturnThis(),
    quit: jest.fn().mockResolvedValue('OK'),
};

const mockClusterInstance = {
    on: jest.fn().mockReturnThis(),
    quit: jest.fn().mockResolvedValue('OK'),
};

jest.mock('ioredis', () => {
    const MockRedis = jest.fn(() => mockRedisInstance);
    const MockCluster = jest.fn(() => mockClusterInstance);

    return {
        __esModule: true,
        Cluster: MockCluster,
        default: MockRedis,
    };
});

describe('RedisCoreModule', () => {
    let module: TestingModule;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(async () => {
        if (module) {
            await module.close();
        }
    });

    describe('forRoot - Synchronous Configuration', () => {
        it('should register module with default options', async () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                port: 6379,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRoot(options)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService).toBeDefined();
            expect(redisService.getClient('default')).toBeDefined();
        });

        it('should register module with custom name', async () => {
            const options: RedisModuleOptions = {
                name: 'custom',
                host: 'localhost',
                port: 6379,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRoot(options)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService.getClient('custom')).toBeDefined();
        });

        it('should create Redis instance for standalone mode', async () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                password: 'secret',
                port: 6379,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRoot(options)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService.getClient('default')).toBeDefined();
        });

        it('should create Cluster instance for cluster mode', async () => {
            const options: RedisModuleOptions = {
                clusterNodes: [
                    { host: 'localhost', port: 7000 },
                    { host: 'localhost', port: 7001 },
                ],
                isCluster: true,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRoot(options)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService.getClient('default')).toBeDefined();
        });

        it('should throw error for cluster mode without nodes', () => {
            const options: RedisModuleOptions = {
                clusterNodes: [],
                isCluster: true,
            };

            // Validation should throw an error for cluster mode without nodes
            expect(() => RedisCoreModule.forRoot(options)).toThrow(
                'Redis cluster mode requires at least one cluster node',
            );
        });
    });

    describe('forRootAsync - Asynchronous Configuration', () => {
        it('should register module with useFactory', async () => {
            const asyncOptions: RedisModuleAsyncOptions = {
                useFactory: () => ({
                    host: 'localhost',
                    port: 6379,
                }),
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRootAsync(asyncOptions)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService).toBeDefined();
        });

        it('should register module with useFactory and inject', async () => {
            const mockConfigService = {
                get: jest.fn((key: string): number | string => {
                    const config = {
                        REDIS_HOST: 'redis-host',
                        REDIS_PORT: 6380,
                    } as const;

                    if (key === 'REDIS_HOST') return config.REDIS_HOST;

                    if (key === 'REDIS_PORT') return config.REDIS_PORT;

                    return '';
                }),
            };

            class ConfigModule {}

            const asyncOptions: RedisModuleAsyncOptions = {
                imports: [
                    {
                        providers: [{ provide: 'ConfigService', useValue: mockConfigService }],
                        exports: ['ConfigService'],
                        module: ConfigModule,
                    },
                ],
                inject: ['ConfigService'],
                useFactory: (...args: unknown[]) => {
                    const configService = args[0] as { get: (key: string) => number | string };

                    return {
                        host: configService.get('REDIS_HOST') as string,
                        port: configService.get('REDIS_PORT') as number,
                    };
                },
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRootAsync(asyncOptions)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService).toBeDefined();
        });

        it('should register module with custom name in async mode', async () => {
            const asyncOptions: RedisModuleAsyncOptions = {
                name: 'async-custom',
                useFactory: () => ({
                    host: 'localhost',
                    port: 6379,
                }),
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRootAsync(asyncOptions)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService.getClient('async-custom')).toBeDefined();
        });

        it('should register module with useClass', async () => {
            class RedisConfigService {
                createRedisOptions(): RedisModuleOptions {
                    return {
                        host: 'localhost',
                        port: 6379,
                    };
                }
            }

            const asyncOptions: RedisModuleAsyncOptions = {
                useClass: RedisConfigService,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRootAsync(asyncOptions)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService).toBeDefined();
            expect(redisService.getClient('default')).toBeDefined();
        });

        it('should register module with useExisting', async () => {
            class ExistingRedisConfigService {
                createRedisOptions(): RedisModuleOptions {
                    return {
                        host: 'redis-existing',
                        port: 6381,
                    };
                }
            }

            class ConfigModule {}

            const asyncOptions: RedisModuleAsyncOptions = {
                imports: [
                    {
                        providers: [ExistingRedisConfigService],
                        exports: [ExistingRedisConfigService],
                        module: ConfigModule,
                    },
                ],
                useExisting: ExistingRedisConfigService,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRootAsync(asyncOptions)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);

            expect(redisService).toBeDefined();
            expect(redisService.getClient('default')).toBeDefined();
        });

        it('should handle error event in async mode', async () => {
            const asyncOptions: RedisModuleAsyncOptions = {
                useFactory: () => ({
                    host: 'localhost',
                    port: 6379,
                }),
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRootAsync(asyncOptions)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);
            const client = redisService.getClient('default');

            // Get the error handler
            const errorHandler = (client.on as jest.Mock).mock.calls.find((call) => call[0] === 'error')?.[1];

            expect(errorHandler).toBeDefined();

            // Trigger error handler
            const testError = new Error('Test error');

            errorHandler(testError);

            // Verify error handler was registered
            expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('should handle connect event in async mode', async () => {
            const asyncOptions: RedisModuleAsyncOptions = {
                useFactory: () => ({
                    host: 'localhost',
                    port: 6379,
                }),
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRootAsync(asyncOptions)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);
            const client = redisService.getClient('default');

            // Get the connect handler
            const connectHandler = (client.on as jest.Mock).mock.calls.find((call) => call[0] === 'connect')?.[1];

            expect(connectHandler).toBeDefined();

            // Trigger connect handler
            connectHandler();

            // Verify connect handler was registered
            expect(client.on).toHaveBeenCalledWith('connect', expect.any(Function));
        });
    });

    describe('Module Structure', () => {
        it('should be a dynamic module', () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                port: 6379,
            };

            const dynamicModule: DynamicModule = RedisCoreModule.forRoot(options);

            expect(dynamicModule.module).toBe(RedisCoreModule);
            expect(dynamicModule.providers).toBeDefined();
            expect(dynamicModule.exports).toBeDefined();
        });

        it('should export RedisService', () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                port: 6379,
            };

            const dynamicModule: DynamicModule = RedisCoreModule.forRoot(options);

            expect(dynamicModule.exports).toContain(RedisService);
        });

        it('should provide REDIS_CLIENT with name', () => {
            const options: RedisModuleOptions = {
                name: 'test',
                host: 'localhost',
                port: 6379,
            };

            const dynamicModule: DynamicModule = RedisCoreModule.forRoot(options);

            const hasClientProvider = dynamicModule.providers?.some(
                (provider: any) => provider.provide === `${REDIS_CLIENT}_test`,
            );

            expect(hasClientProvider).toBe(true);
        });

        it('should export RedisService and client provider', () => {
            const options: RedisModuleOptions = {
                name: 'test',
                host: 'localhost',
                port: 6379,
            };

            const dynamicModule: DynamicModule = RedisCoreModule.forRoot(options);

            expect(dynamicModule.exports).toContain(RedisService);

            // Check if client provider is in exports (it may be the provider object itself)
            const hasClientInExports = dynamicModule.exports?.some(
                (exp: any) =>
                    exp === `${REDIS_CLIENT}_test` ||
                    (typeof exp === 'object' && exp.provide === `${REDIS_CLIENT}_test`),
            );

            expect(hasClientInExports).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle Redis connection errors', async () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                port: 6379,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRoot(options)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);
            const client = redisService.getClient('default');

            // Verify client has error handler
            expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('should handle Redis connect event', async () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                port: 6379,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRoot(options)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);
            const client = redisService.getClient('default');

            // Verify client has connect handler
            expect(client.on).toHaveBeenCalledWith('connect', expect.any(Function));
        });

        it('should trigger error handler in sync mode', async () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                port: 6379,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRoot(options)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);
            const client = redisService.getClient('default');

            // Get the error handler
            const errorHandler = (client.on as jest.Mock).mock.calls.find((call) => call[0] === 'error')?.[1];

            expect(errorHandler).toBeDefined();

            // Trigger error handler
            const testError = new Error('Connection failed');

            testError.stack = 'Error: Connection failed\n    at test';
            errorHandler(testError);

            // Verify error handler was registered
            expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('should trigger connect handler in sync mode', async () => {
            const options: RedisModuleOptions = {
                host: 'localhost',
                port: 6379,
            };

            module = await Test.createTestingModule({
                imports: [RedisCoreModule.forRoot(options)],
            }).compile();

            const redisService = module.get<RedisService>(RedisService);
            const client = redisService.getClient('default');

            // Get the connect handler
            const connectHandler = (client.on as jest.Mock).mock.calls.find((call) => call[0] === 'connect')?.[1];

            expect(connectHandler).toBeDefined();

            // Trigger connect handler
            connectHandler();

            // Verify connect handler was registered
            expect(client.on).toHaveBeenCalledWith('connect', expect.any(Function));
        });
    });

    describe('Multiple Connections', () => {
        it('should create multiple dynamic modules', () => {
            const connection1: RedisModuleOptions = {
                name: 'conn1',
                host: 'localhost',
                port: 6379,
            };

            const connection2: RedisModuleOptions = {
                name: 'conn2',
                host: 'localhost',
                port: 6380,
            };

            const module1 = RedisCoreModule.forRoot(connection1);
            const module2 = RedisCoreModule.forRoot(connection2);

            expect(module1.module).toBe(RedisCoreModule);
            expect(module2.module).toBe(RedisCoreModule);

            // Check that each module has its own client provider
            const hasConn1Provider = module1.providers?.some(
                (provider: any) => provider.provide === `${REDIS_CLIENT}_conn1`,
            );

            const hasConn2Provider = module2.providers?.some(
                (provider: any) => provider.provide === `${REDIS_CLIENT}_conn2`,
            );

            expect(hasConn1Provider).toBe(true);
            expect(hasConn2Provider).toBe(true);
        });
    });
});
