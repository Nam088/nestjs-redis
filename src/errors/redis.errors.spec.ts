import {
    RedisClientNotFoundError,
    RedisClusterConfigError,
    RedisConnectionError,
    RedisError,
    RedisSerializationError,
    RedisTimeoutError,
} from './redis.errors';

describe('Redis Errors', () => {
    describe('RedisError', () => {
        it('should create a base error with message', () => {
            const error = new RedisError('Test error');

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('RedisError');
            expect(error.message).toBe('Test error');
        });

        it('should include cause if provided', () => {
            const cause = new Error('Original error');
            const error = new RedisError('Test error', cause);

            expect(error.cause).toBe(cause);
        });
    });

    describe('RedisConnectionError', () => {
        it('should create error with client name', () => {
            const error = new RedisConnectionError('cache');

            expect(error).toBeInstanceOf(RedisError);
            expect(error.name).toBe('RedisConnectionError');
            expect(error.clientName).toBe('cache');
            expect(error.message).toContain('cache');
        });

        it('should include cause message', () => {
            const cause = new Error('ECONNREFUSED');
            const error = new RedisConnectionError('default', cause);

            expect(error.message).toContain('ECONNREFUSED');
            expect(error.cause).toBe(cause);
        });
    });

    describe('RedisSerializationError', () => {
        it('should create error for parse operation', () => {
            const cause = new Error('Unexpected token');
            const error = new RedisSerializationError('user:123', 'parse', cause);

            expect(error).toBeInstanceOf(RedisError);
            expect(error.name).toBe('RedisSerializationError');
            expect(error.key).toBe('user:123');
            expect(error.operation).toBe('parse');
            expect(error.message).toContain('parse');
            expect(error.message).toContain('user:123');
        });

        it('should create error for stringify operation', () => {
            const cause = new Error('Circular reference');
            const error = new RedisSerializationError('data:456', 'stringify', cause);

            expect(error.operation).toBe('stringify');
            expect(error.message).toContain('stringify');
        });
    });

    describe('RedisTimeoutError', () => {
        it('should create error with operation and timeout', () => {
            const error = new RedisTimeoutError('ping', 5000);

            expect(error).toBeInstanceOf(RedisError);
            expect(error.name).toBe('RedisTimeoutError');
            expect(error.operation).toBe('ping');
            expect(error.timeoutMs).toBe(5000);
            expect(error.message).toContain('ping');
            expect(error.message).toContain('5000ms');
        });
    });

    describe('RedisClientNotFoundError', () => {
        it('should create error with client name', () => {
            const error = new RedisClientNotFoundError('sessions');

            expect(error).toBeInstanceOf(RedisError);
            expect(error.name).toBe('RedisClientNotFoundError');
            expect(error.clientName).toBe('sessions');
            expect(error.message).toContain('sessions');
        });
    });

    describe('RedisClusterConfigError', () => {
        it('should create error with message', () => {
            const error = new RedisClusterConfigError('No cluster nodes provided');

            expect(error).toBeInstanceOf(RedisError);
            expect(error.name).toBe('RedisClusterConfigError');
            expect(error.message).toBe('No cluster nodes provided');
        });
    });
});
