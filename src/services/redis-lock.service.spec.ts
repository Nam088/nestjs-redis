import type { Redis } from 'ioredis';

import { RedisLockService } from './redis-lock.service';

import type { RedisService } from './redis.service';

// eslint-disable-next-line max-lines-per-function
describe('RedisLockService', () => {
    let lockService: RedisLockService;
    let mockRedisService: jest.Mocked<Partial<RedisService>>;
    let mockRedisClient: jest.Mocked<Partial<Redis>>;

    beforeEach(() => {
        mockRedisClient = {
            del: jest.fn(),
            eval: jest.fn(),
            get: jest.fn(),
            pttl: jest.fn(),
            set: jest.fn(),
        };

        mockRedisService = {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
        };

        lockService = new RedisLockService(mockRedisService as unknown as RedisService);
    });

    describe('acquire', () => {
        it('should acquire lock successfully', async () => {
            mockRedisClient.set.mockResolvedValue('OK');

            const lock = await lockService.acquire('resource:123');

            expect(lock).not.toBeNull();
            expect(lock?.lockId).toBeDefined();
            expect(lock?.key).toBe('lock:resource:123');
            expect(mockRedisClient.set).toHaveBeenCalledWith(
                'lock:resource:123',
                expect.any(String),
                'PX',
                10000,
                'NX',
            );
        });

        it('should return null when lock is already held', async () => {
            mockRedisClient.set.mockResolvedValue(null);

            const lock = await lockService.acquire('resource:123', {
                retryCount: 0,
            });

            expect(lock).toBeNull();
        });

        it('should retry acquiring lock', async () => {
            mockRedisClient.set.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce('OK');

            const lock = await lockService.acquire('resource:123', {
                retryCount: 3,
                retryDelayMs: 10,
            });

            expect(lock).not.toBeNull();
            expect(mockRedisClient.set).toHaveBeenCalledTimes(3);
        });

        it('should use custom TTL', async () => {
            mockRedisClient.set.mockResolvedValue('OK');

            await lockService.acquire('resource:123', { ttlMs: 5000 });

            expect(mockRedisClient.set).toHaveBeenCalledWith('lock:resource:123', expect.any(String), 'PX', 5000, 'NX');
        });
    });

    describe('release', () => {
        it('should release lock via LockResult', async () => {
            mockRedisClient.set.mockResolvedValue('OK');
            mockRedisClient.eval.mockResolvedValue(1);

            const lock = await lockService.acquire('resource:123');
            const released = await lock.release();

            expect(released).toBe(true);
            expect(mockRedisClient.eval).toHaveBeenCalled();
        });

        it('should return false if lock already expired', async () => {
            mockRedisClient.set.mockResolvedValue('OK');
            mockRedisClient.eval.mockResolvedValue(0);

            const lock = await lockService.acquire('resource:123');
            const released = await lock.release();

            expect(released).toBe(false);
        });
    });

    describe('extend', () => {
        it('should extend lock TTL', async () => {
            mockRedisClient.set.mockResolvedValue('OK');
            mockRedisClient.eval.mockResolvedValue(1);

            const lock = await lockService.acquire('resource:123');
            const extended = await lock.extend(20000);

            expect(extended).toBe(true);
            expect(mockRedisClient.eval).toHaveBeenCalled();
        });

        it('should return false if lock expired', async () => {
            mockRedisClient.set.mockResolvedValue('OK');
            mockRedisClient.eval.mockResolvedValue(0);

            const lock = await lockService.acquire('resource:123');
            const extended = await lock.extend(20000);

            expect(extended).toBe(false);
        });
    });

    describe('withLock', () => {
        it('should execute function with lock', async () => {
            mockRedisClient.set.mockResolvedValue('OK');
            mockRedisClient.eval.mockResolvedValue(1);

            const fn = jest.fn().mockResolvedValue('result');
            const result = await lockService.withLock('resource:123', fn);

            expect(result).toBe('result');
            expect(fn).toHaveBeenCalled();
            expect(mockRedisClient.eval).toHaveBeenCalled(); // release
        });

        it('should throw if lock cannot be acquired', async () => {
            mockRedisClient.set.mockResolvedValue(null);

            await expect(lockService.withLock('resource:123', async () => 'result', { retryCount: 0 })).rejects.toThrow(
                'Failed to acquire lock for key: resource:123',
            );
        });

        it('should release lock even if function throws', async () => {
            mockRedisClient.set.mockResolvedValue('OK');
            mockRedisClient.eval.mockResolvedValue(1);

            const fn = jest.fn().mockRejectedValue(new Error('Function error'));

            await expect(lockService.withLock('resource:123', fn)).rejects.toThrow('Function error');
            expect(mockRedisClient.eval).toHaveBeenCalled(); // release still called
        });
    });

    describe('isLocked', () => {
        it('should return true when lock exists', async () => {
            mockRedisClient.get.mockResolvedValue('some-lock-id');

            const locked = await lockService.isLocked('resource:123');

            expect(locked).toBe(true);
            expect(mockRedisClient.get).toHaveBeenCalledWith('lock:resource:123');
        });

        it('should return false when lock does not exist', async () => {
            mockRedisClient.get.mockResolvedValue(null);

            const locked = await lockService.isLocked('resource:123');

            expect(locked).toBe(false);
        });
    });

    describe('getLockTTL', () => {
        it('should return TTL in milliseconds', async () => {
            mockRedisClient.pttl.mockResolvedValue(5000);

            const ttl = await lockService.getLockTTL('resource:123');

            expect(ttl).toBe(5000);
            expect(mockRedisClient.pttl).toHaveBeenCalledWith('lock:resource:123');
        });
    });

    describe('forceRelease', () => {
        it('should force release lock', async () => {
            mockRedisClient.del.mockResolvedValue(1);

            const result = await lockService.forceRelease('resource:123');

            expect(result).toBe(true);
            expect(mockRedisClient.del).toHaveBeenCalledWith('lock:resource:123');
        });

        it('should return false if lock did not exist', async () => {
            mockRedisClient.del.mockResolvedValue(0);

            const result = await lockService.forceRelease('resource:123');

            expect(result).toBe(false);
        });
    });
});
