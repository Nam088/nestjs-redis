/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable max-lines-per-function */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { HealthIndicatorService } from '@nestjs/terminus';

import { RedisService } from '../services/redis.service';

import { RedisHealthIndicator } from './redis.health';

describe('RedisHealthIndicator', () => {
    let indicator: RedisHealthIndicator;
    let redisService: jest.Mocked<RedisService>;

    beforeEach(async () => {
        const mockRedisService = {
            getClient: jest.fn(),
            getClients: jest.fn(),
        };

        const mockHealthIndicatorService = {
            check: jest.fn().mockImplementation((key: string) => ({
                down: jest.fn((data?: unknown) => {
                    const errorData = typeof data === 'string' ? { error: data } : (data as Record<string, unknown>);

                    return {
                        [key]: {
                            status: 'down',
                            ...errorData,
                        },
                    };
                }),
                up: jest.fn((data?: unknown) => ({
                    [key]: {
                        status: 'up',
                        ...(data as Record<string, unknown>),
                    },
                })),
            })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisHealthIndicator,
                {
                    provide: RedisService,
                    useValue: mockRedisService,
                },
                {
                    provide: HealthIndicatorService,
                    useValue: mockHealthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
        redisService = module.get(RedisService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isHealthy', () => {
        it('should return healthy status when Redis connection is working', async () => {
            const mockClient = {
                ping: jest.fn().mockResolvedValue('PONG'),
            };

            redisService.getClient.mockReturnValue(mockClient as any);

            const result = await indicator.isHealthy('redis');

            expect(result).toEqual({
                redis: {
                    status: 'up',
                    connection: 'default',
                },
            });
            expect(redisService.getClient).toHaveBeenCalledWith('default');
            expect(mockClient.ping).toHaveBeenCalled();
        });

        it('should return healthy status for named connection', async () => {
            const mockClient = {
                ping: jest.fn().mockResolvedValue('PONG'),
            };

            redisService.getClient.mockReturnValue(mockClient as any);

            const result = await indicator.isHealthy('redis', 'custom');

            expect(result).toEqual({
                redis: {
                    status: 'up',
                    connection: 'custom',
                },
            });
            expect(redisService.getClient).toHaveBeenCalledWith('custom');
            expect(mockClient.ping).toHaveBeenCalled();
        });

        it('should return down status when client is not found', async () => {
            redisService.getClient.mockReturnValue(null as any);

            const result = await indicator.isHealthy('redis');

            expect(result).toEqual({
                redis: {
                    status: 'down',
                    error: 'Redis client "default" not found',
                },
            });
            expect(redisService.getClient).toHaveBeenCalledWith('default');
        });

        it('should return down status when ping fails', async () => {
            const mockClient = {
                ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
            };

            redisService.getClient.mockReturnValue(mockClient as any);

            const result = await indicator.isHealthy('redis');

            expect(result).toEqual({
                redis: {
                    status: 'down',
                    error: 'Connection failed',
                },
            });
            expect(mockClient.ping).toHaveBeenCalled();
        });

        it('should handle unknown errors', async () => {
            const mockClient = {
                ping: jest.fn().mockRejectedValue('Unknown error'),
            };

            redisService.getClient.mockReturnValue(mockClient as any);

            const result = await indicator.isHealthy('redis');

            expect(result).toEqual({
                redis: {
                    status: 'down',
                    error: 'Unknown error',
                },
            });
        });
    });

    describe('checkAllConnections', () => {
        it('should return healthy status when all connections are working', async () => {
            const mockClient1 = {
                ping: jest.fn().mockResolvedValue('PONG'),
            };
            const mockClient2 = {
                ping: jest.fn().mockResolvedValue('PONG'),
            };

            const mockClients = new Map();

            mockClients.set('default', mockClient1);
            mockClients.set('custom', mockClient2);
            redisService.getClients.mockReturnValue(mockClients);

            const result = await indicator.checkAllConnections('redis');

            expect(result).toEqual({
                redis: {
                    status: 'up',
                    connections: [
                        { name: 'default', status: 'up' },
                        { name: 'custom', status: 'up' },
                    ],
                    total: 2,
                },
            });
            expect(mockClient1.ping).toHaveBeenCalled();
            expect(mockClient2.ping).toHaveBeenCalled();
        });

        it('should return down status when no connections found', async () => {
            redisService.getClients.mockReturnValue(new Map());

            const result = await indicator.checkAllConnections('redis');

            expect(result).toEqual({
                redis: {
                    status: 'down',
                    error: 'No Redis connections found',
                },
            });
        });

        it('should return down status when one connection fails', async () => {
            const mockClient1 = {
                ping: jest.fn().mockResolvedValue('PONG'),
            };
            const mockClient2 = {
                ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
            };

            const mockClients = new Map();

            mockClients.set('default', mockClient1);
            mockClients.set('custom', mockClient2);
            redisService.getClients.mockReturnValue(mockClients);

            const result = await indicator.checkAllConnections('redis');

            expect(result).toEqual({
                redis: {
                    status: 'down',
                    connections: [
                        { name: 'default', status: 'up' },
                        { name: 'custom', status: 'down', error: 'Connection failed' },
                    ],
                    total: 2,
                },
            });
            expect(mockClient1.ping).toHaveBeenCalled();
            expect(mockClient2.ping).toHaveBeenCalled();
        });

        it('should handle unknown errors in connection checks', async () => {
            const mockClient1 = {
                ping: jest.fn().mockResolvedValue('PONG'),
            };
            const mockClient2 = {
                ping: jest.fn().mockRejectedValue('Unknown error'),
            };

            const mockClients = new Map();

            mockClients.set('default', mockClient1);
            mockClients.set('custom', mockClient2);
            redisService.getClients.mockReturnValue(mockClients);

            const result = await indicator.checkAllConnections('redis');

            expect(result).toEqual({
                redis: {
                    status: 'down',
                    connections: [
                        { name: 'default', status: 'up' },
                        { name: 'custom', status: 'down', error: 'Unknown error' },
                    ],
                    total: 2,
                },
            });
        });

        it('should return down status when all connections fail', async () => {
            const mockClient1 = {
                ping: jest.fn().mockRejectedValue(new Error('Connection 1 failed')),
            };
            const mockClient2 = {
                ping: jest.fn().mockRejectedValue(new Error('Connection 2 failed')),
            };

            const mockClients = new Map();

            mockClients.set('default', mockClient1);
            mockClients.set('custom', mockClient2);
            redisService.getClients.mockReturnValue(mockClients);

            const result = await indicator.checkAllConnections('redis');

            expect(result).toEqual({
                redis: {
                    status: 'down',
                    connections: [
                        { name: 'default', status: 'down', error: 'Connection 1 failed' },
                        { name: 'custom', status: 'down', error: 'Connection 2 failed' },
                    ],
                    total: 2,
                },
            });
        });
    });
});
