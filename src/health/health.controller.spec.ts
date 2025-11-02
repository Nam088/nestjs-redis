/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prefer-destructuring */
/* eslint-disable max-lines-per-function */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { HealthCheckService } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

import type { HealthCheckResult } from '@nestjs/terminus';

describe('HealthController', () => {
    let controller: HealthController;
    let healthCheckService: jest.Mocked<HealthCheckService>;
    let redisHealthIndicator: jest.Mocked<RedisHealthIndicator>;

    beforeEach(async () => {
        const mockHealthCheckService = {
            check: jest.fn(),
        };

        const mockRedisHealthIndicator = {
            checkAllConnections: jest.fn(),
            isHealthy: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: HealthCheckService,
                    useValue: mockHealthCheckService,
                },
                {
                    provide: RedisHealthIndicator,
                    useValue: mockRedisHealthIndicator,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        healthCheckService = module.get(HealthCheckService);
        redisHealthIndicator = module.get(RedisHealthIndicator);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('check', () => {
        it('should perform basic health check', async () => {
            const expectedResult: HealthCheckResult = {
                status: 'ok',
                details: { redis: { status: 'up' } },
                error: {},
                info: { redis: { status: 'up' } },
            };

            healthCheckService.check.mockResolvedValue(expectedResult);

            const result = await controller.check();

            expect(result).toEqual(expectedResult);
            expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);

            // Verify the health check function calls redisHealth.isHealthy
            const healthCheckFn = (healthCheckService.check as jest.Mock).mock.calls[0][0][0];

            await healthCheckFn();
            expect(redisHealthIndicator.isHealthy).toHaveBeenCalledWith('redis');
        });

        it('should return error status when health check fails', async () => {
            const expectedResult: HealthCheckResult = {
                status: 'error',
                details: { redis: { status: 'down', error: 'Connection failed' } },
                error: { redis: { status: 'down', error: 'Connection failed' } },
                info: {},
            };

            healthCheckService.check.mockResolvedValue(expectedResult);

            const result = await controller.check();

            expect(result).toEqual(expectedResult);
            expect(healthCheckService.check).toHaveBeenCalled();
        });
    });

    describe('checkRedis', () => {
        it('should check all Redis connections', async () => {
            const expectedResult: HealthCheckResult = {
                status: 'ok',
                details: {
                    redis: {
                        status: 'up',
                        connections: [
                            { name: 'default', status: 'up' },
                            { name: 'custom', status: 'up' },
                        ],
                        total: 2,
                    },
                },
                error: {},
                info: {
                    redis: {
                        status: 'up',
                        connections: [
                            { name: 'default', status: 'up' },
                            { name: 'custom', status: 'up' },
                        ],
                        total: 2,
                    },
                },
            };

            healthCheckService.check.mockResolvedValue(expectedResult);

            const result = await controller.checkRedis();

            expect(result).toEqual(expectedResult);
            expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);

            // Verify the health check function calls redisHealth.checkAllConnections
            const healthCheckFn = (healthCheckService.check as jest.Mock).mock.calls[0][0][0];

            await healthCheckFn();
            expect(redisHealthIndicator.checkAllConnections).toHaveBeenCalledWith('redis');
        });

        it('should return error when one connection fails', async () => {
            const expectedResult: HealthCheckResult = {
                status: 'error',
                details: {
                    redis: {
                        status: 'down',
                        error: 'One or more Redis connections are down',
                    },
                },
                error: {
                    redis: {
                        status: 'down',
                        error: 'One or more Redis connections are down',
                    },
                },
                info: {},
            };

            healthCheckService.check.mockResolvedValue(expectedResult);

            const result = await controller.checkRedis();

            expect(result).toEqual(expectedResult);
            expect(healthCheckService.check).toHaveBeenCalled();
        });
    });

    describe('checkRedisConnection', () => {
        it('should check specific Redis connection', async () => {
            const expectedResult: HealthCheckResult = {
                status: 'ok',
                details: { redis: { status: 'up', connection: 'custom' } },
                error: {},
                info: { redis: { status: 'up', connection: 'custom' } },
            };

            healthCheckService.check.mockResolvedValue(expectedResult);

            const result = await controller.checkRedisConnection('custom');

            expect(result).toEqual(expectedResult);
            expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);

            // Verify the health check function calls redisHealth.isHealthy with connection name
            const healthCheckFn = (healthCheckService.check as jest.Mock).mock.calls[0][0][0];

            await healthCheckFn();
            expect(redisHealthIndicator.isHealthy).toHaveBeenCalledWith('redis', 'custom');
        });

        it('should return error when specific connection fails', async () => {
            const expectedResult: HealthCheckResult = {
                status: 'error',
                details: { redis: { status: 'down', error: 'Connection failed' } },
                error: { redis: { status: 'down', error: 'Connection failed' } },
                info: {},
            };

            healthCheckService.check.mockResolvedValue(expectedResult);

            const result = await controller.checkRedisConnection('custom');

            expect(result).toEqual(expectedResult);
            expect(healthCheckService.check).toHaveBeenCalled();
        });

        it('should handle non-existent connection', async () => {
            const expectedResult: HealthCheckResult = {
                status: 'error',
                details: { redis: { status: 'down', error: 'Redis client "nonexistent" not found' } },
                error: { redis: { status: 'down', error: 'Redis client "nonexistent" not found' } },
                info: {},
            };

            healthCheckService.check.mockResolvedValue(expectedResult);

            const result = await controller.checkRedisConnection('nonexistent');

            expect(result).toEqual(expectedResult);
            expect(healthCheckService.check).toHaveBeenCalled();
        });
    });
});
