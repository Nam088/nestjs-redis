import * as IndexExports from './index';

describe('Index Exports', () => {
    it('should export constants', () => {
        expect(IndexExports.REDIS_CLIENT).toBeDefined();
        expect(IndexExports.REDIS_MODULE_OPTIONS).toBeDefined();
        expect(IndexExports.DEFAULT_REDIS_NAME).toBeDefined();
    });

    it('should export decorators', () => {
        expect(IndexExports.InjectRedis).toBeDefined();
        expect(typeof IndexExports.InjectRedis).toBe('function');
    });

    it('should export modules', () => {
        expect(IndexExports.RedisCoreModule).toBeDefined();
        expect(IndexExports.RedisModule).toBeDefined();
    });

    it('should export services', () => {
        expect(IndexExports.RedisService).toBeDefined();
    });

    it('should re-export ioredis types', () => {
        expect(IndexExports.Redis).toBeDefined();
        expect(IndexExports.Cluster).toBeDefined();
    });

    it('should have all expected exports', () => {
        const expectedExports = [
            'REDIS_CLIENT',
            'REDIS_MODULE_OPTIONS',
            'DEFAULT_REDIS_NAME',
            'InjectRedis',
            'RedisCoreModule',
            'RedisModule',
            'RedisService',
            'Redis',
            'Cluster',
        ];

        expectedExports.forEach((exportName) => {
            expect(IndexExports).toHaveProperty(exportName);
        });
    });
});
