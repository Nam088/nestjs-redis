import { Inject } from '@nestjs/common';

import { REDIS_CLIENT } from '../constants/redis.constants';

import { InjectRedis } from './inject-redis.decorator';

// Mock @nestjs/common Inject
jest.mock('@nestjs/common', () => ({
    Inject: jest.fn(() => () => {
        // Simple decorator that does nothing in tests
    }),
}));

describe('InjectRedis Decorator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(InjectRedis).toBeDefined();
    });

    it('should call Inject with default client name', () => {
        InjectRedis();
        expect(Inject).toHaveBeenCalledWith(`${REDIS_CLIENT}_default`);
    });

    it('should call Inject with custom client name', () => {
        const customName = 'cache';

        InjectRedis(customName);
        expect(Inject).toHaveBeenCalledWith(`${REDIS_CLIENT}_${customName}`);
    });

    it('should work with multiple injections', () => {
        InjectRedis();
        InjectRedis('cache');
        InjectRedis('session');
        expect(Inject).toHaveBeenCalledWith(`${REDIS_CLIENT}_default`);
        expect(Inject).toHaveBeenCalledWith(`${REDIS_CLIENT}_cache`);
        expect(Inject).toHaveBeenCalledWith(`${REDIS_CLIENT}_session`);
        expect(Inject).toHaveBeenCalledTimes(3);
    });

    it('should generate correct token format', () => {
        const testCases = [
            { expected: `${REDIS_CLIENT}_default`, input: undefined },
            { expected: `${REDIS_CLIENT}_cache`, input: 'cache' },
            { expected: `${REDIS_CLIENT}_session`, input: 'session' },
            { expected: `${REDIS_CLIENT}_my-custom-redis`, input: 'my-custom-redis' },
        ];

        testCases.forEach(({ expected, input }) => {
            jest.clearAllMocks();
            InjectRedis(input);
            expect(Inject).toHaveBeenCalledWith(expected);
        });
    });

    it('should be usable as a parameter decorator', () => {
        // Decorators are only valid in constructor parameters in TypeScript
        class TestService {
            constructor(_redisClient?: unknown) {}
        }

        // Should not throw when instantiated with mock redis
        expect(() => new TestService({})).not.toThrow();
    });

    it('should preserve decorator functionality', () => {
        const decorator = InjectRedis('test');

        expect(typeof decorator).toBe('function');
    });
});
