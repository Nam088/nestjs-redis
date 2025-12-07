/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { RedisService } from './redis.service';

import type Redis from 'ioredis';

describe('RedisService', () => {
    let service: RedisService;
    let mockRedisClient: jest.Mocked<Redis>;

    beforeEach(async () => {
        mockRedisClient = {
            type: jest.fn(),
            decr: jest.fn(),
            decrby: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            expire: jest.fn(),
            flushdb: jest.fn(),
            get: jest.fn(),
            hdel: jest.fn(),
            hexists: jest.fn(),
            hget: jest.fn(),
            hgetall: jest.fn(),
            hkeys: jest.fn(),
            hlen: jest.fn(),
            hset: jest.fn(),
            incr: jest.fn(),
            incrby: jest.fn(),
            keys: jest.fn(),
            llen: jest.fn(),
            lpop: jest.fn(),
            lpush: jest.fn(),
            lrange: jest.fn(),
            mget: jest.fn(),
            mset: jest.fn(),
            persist: jest.fn(),
            publish: jest.fn(),
            quit: jest.fn(),
            rename: jest.fn(),
            rpop: jest.fn(),
            rpush: jest.fn(),
            sadd: jest.fn(),
            scard: jest.fn(),
            set: jest.fn(),
            setex: jest.fn(),
            sismember: jest.fn(),
            smembers: jest.fn(),
            srem: jest.fn(),
            ttl: jest.fn(),
            zadd: jest.fn(),
            zcard: jest.fn(),
            zrange: jest.fn(),
            zrangebyscore: jest.fn(),
            zrem: jest.fn(),
            zscore: jest.fn(),
            hincrby: jest.fn().mockResolvedValue(1),
            scan: jest.fn().mockResolvedValue(['0', []]),
        } as unknown as jest.Mocked<Redis>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [RedisService],
        }).compile();

        service = module.get<RedisService>(RedisService);
        service.addClient('default', mockRedisClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Client Management', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should add and get client', () => {
            const newClient = {} as Redis;

            service.addClient('test', newClient);
            expect(service.getClient('test')).toBe(newClient);
        });

        it('should throw error when client not found', () => {
            expect(() => service.getClient('nonexistent')).toThrow('Redis client with name "nonexistent" not found');
        });

        it('should get all clients', () => {
            const clients = service.getClients();

            expect(clients.size).toBe(1);
            expect(clients.get('default')).toBe(mockRedisClient);
        });
    });

    describe('Base Operations (inherited)', () => {
        it('should check exists', async () => {
            mockRedisClient.exists.mockResolvedValue(1);

            expect(await service.exists('key')).toBe(true);
            expect(mockRedisClient.exists).toHaveBeenCalledWith('key');
        });

        it('should delete keys', async () => {
            mockRedisClient.del.mockResolvedValue(2);

            expect(await service.delete(['k1', 'k2'])).toBe(2);
        });

        it('should get TTL', async () => {
            mockRedisClient.ttl.mockResolvedValue(3600);

            expect(await service.getTTL('key')).toBe(3600);
        });

        it('should set expire', async () => {
            mockRedisClient.expire.mockResolvedValue(1);

            expect(await service.expire('key', 3600)).toBe(1);
        });

        it('should persist', async () => {
            mockRedisClient.persist.mockResolvedValue(1);

            expect(await service.persist('key')).toBe(1);
        });

        it('should flush DB', async () => {
            mockRedisClient.flushdb.mockResolvedValue('OK');

            expect(await service.flushDB()).toBe('OK');
        });

        it('should get keys', async () => {
            mockRedisClient.keys.mockResolvedValue(['k1', 'k2']);

            expect(await service.keys('*')).toEqual(['k1', 'k2']);
        });

        it('should close connections on destroy', async () => {
            mockRedisClient.quit.mockResolvedValue('OK');

            await service.onModuleDestroy();

            expect(mockRedisClient.quit).toHaveBeenCalled();
            expect(service.getClients().size).toBe(0);
        });
    });

    describe('String Operations', () => {
        it('get', async () => {
            mockRedisClient.get.mockResolvedValue('value');

            expect(await service.get('key')).toBe('value');
        });

        it('set', async () => {
            mockRedisClient.set.mockResolvedValue('OK');

            expect(await service.set('key', 'value')).toBe('OK');
        });

        it('setWithTTL', async () => {
            mockRedisClient.setex.mockResolvedValue('OK');

            expect(await service.setWithTTL('key', 'value', 3600)).toBe('OK');
            expect(mockRedisClient.setex).toHaveBeenCalledWith('key', 3600, 'value');
        });

        it('getJSON', async () => {
            mockRedisClient.get.mockResolvedValue('{"name":"test"}');

            expect(await service.getJSON('key')).toEqual({ name: 'test' });
        });

        it('setJSON', async () => {
            mockRedisClient.set.mockResolvedValue('OK');

            await service.setJSON('key', { name: 'test' });
            expect(mockRedisClient.set).toHaveBeenCalledWith('key', '{"name":"test"}');
        });

        it('increment', async () => {
            mockRedisClient.incr.mockResolvedValue(1);

            expect(await service.increment('counter')).toBe(1);
        });

        it('decrement', async () => {
            mockRedisClient.decr.mockResolvedValue(9);

            expect(await service.decrement('counter')).toBe(9);
        });

        it('mget', async () => {
            mockRedisClient.mget.mockResolvedValue(['v1', 'v2']);

            expect(await service.mget(['k1', 'k2'])).toEqual(['v1', 'v2']);
        });

        it('mset', async () => {
            mockRedisClient.mset.mockResolvedValue('OK');

            expect(await service.mset({ k1: 'v1', k2: 'v2' })).toBe('OK');
        });
    });

    describe('Hash Operations', () => {
        it('hashGet', async () => {
            mockRedisClient.hget.mockResolvedValue('value');

            expect(await service.hashGet('hash', 'field')).toBe('value');
        });

        it('hashSet', async () => {
            mockRedisClient.hset.mockResolvedValue(2);

            expect(await service.hashSet('hash', { f1: 'v1' })).toBe(2);
        });

        it('hashGetAll', async () => {
            mockRedisClient.hgetall.mockResolvedValue({ f1: 'v1' });

            expect(await service.hashGetAll('hash')).toEqual({ f1: 'v1' });
        });

        it('hashDelete', async () => {
            mockRedisClient.hdel.mockResolvedValue(1);

            expect(await service.hashDelete('hash', 'field')).toBe(1);
        });

        it('hashExists', async () => {
            mockRedisClient.hexists.mockResolvedValue(1);

            expect(await service.hashExists('hash', 'field')).toBe(true);
        });

        it('hashKeys', async () => {
            mockRedisClient.hkeys.mockResolvedValue(['f1', 'f2']);

            expect(await service.hashKeys('hash')).toEqual(['f1', 'f2']);
        });

        it('hashLength', async () => {
            mockRedisClient.hlen.mockResolvedValue(5);

            expect(await service.hashLength('hash')).toBe(5);
        });
    });

    describe('List Operations', () => {
        it('listPushLeft', async () => {
            mockRedisClient.lpush.mockResolvedValue(1);

            expect(await service.listPushLeft('list', 'value')).toBe(1);
        });

        it('listPushRight', async () => {
            mockRedisClient.rpush.mockResolvedValue(1);

            expect(await service.listPushRight('list', 'value')).toBe(1);
        });

        it('listPopLeft', async () => {
            (mockRedisClient.lpop as jest.Mock).mockResolvedValue('value');

            expect(await service.listPopLeft('list')).toBe('value');
        });

        it('listPopRight', async () => {
            (mockRedisClient.rpop as jest.Mock).mockResolvedValue('value');

            expect(await service.listPopRight('list')).toBe('value');
        });

        it('listRange', async () => {
            mockRedisClient.lrange.mockResolvedValue(['v1', 'v2']);

            expect(await service.listRange('list', 0, -1)).toEqual(['v1', 'v2']);
        });

        it('listLength', async () => {
            mockRedisClient.llen.mockResolvedValue(5);

            expect(await service.listLength('list')).toBe(5);
        });
    });

    describe('Set Operations', () => {
        it('setAdd', async () => {
            mockRedisClient.sadd.mockResolvedValue(2);

            expect(await service.setAdd('set', ['m1', 'm2'])).toBe(2);
        });

        it('setRemove', async () => {
            mockRedisClient.srem.mockResolvedValue(1);

            expect(await service.setRemove('set', 'member')).toBe(1);
        });

        it('setMembers', async () => {
            mockRedisClient.smembers.mockResolvedValue(['m1', 'm2']);

            expect(await service.setMembers('set')).toEqual(['m1', 'm2']);
        });

        it('setIsMember', async () => {
            mockRedisClient.sismember.mockResolvedValue(1);

            expect(await service.setIsMember('set', 'member')).toBe(true);
        });

        it('setCount', async () => {
            mockRedisClient.scard.mockResolvedValue(5);

            expect(await service.setCount('set')).toBe(5);
        });
    });

    describe('Sorted Set Operations', () => {
        it('zAdd', async () => {
            (mockRedisClient.zadd as jest.Mock).mockResolvedValue(2);

            expect(await service.zAdd('zset', [{ member: 'm1', score: 1 }])).toBe(2);
        });

        it('zRemove', async () => {
            mockRedisClient.zrem.mockResolvedValue(1);

            expect(await service.zRemove('zset', 'member')).toBe(1);
        });

        it('zRange', async () => {
            mockRedisClient.zrange.mockResolvedValue(['m1', 'm2']);

            expect(await service.zRange('zset', 0, -1)).toEqual(['m1', 'm2']);
        });

        it('zScore', async () => {
            mockRedisClient.zscore.mockResolvedValue('10');

            expect(await service.zScore('zset', 'member')).toBe('10');
        });

        it('zCount', async () => {
            mockRedisClient.zcard.mockResolvedValue(5);

            expect(await service.zCount('zset')).toBe(5);
        });

        it('zRangeByScore', async () => {
            mockRedisClient.zrangebyscore.mockResolvedValue(['m1']);

            expect(await service.zRangeByScore('zset', 0, 100)).toEqual(['m1']);
        });
    });

    describe('Pub/Sub Operations', () => {
        it('publish', async () => {
            mockRedisClient.publish.mockResolvedValue(3);

            expect(await service.publish('channel', 'message')).toBe(3);
        });
    });

    describe('withClient', () => {
        it('should return a proxy that uses the specified client name', async () => {
            const spy = jest.spyOn(service, 'getClient');
            
            // We need to mock the second client in the service map if we want it to succeed without error,
            // or we expect it to fail with "not found" which proves it tried to use the name.
            // Let's rely on getClient calling logical behavior.
            
            // Setup a second client
            const secondClient = { ...mockRedisClient } as unknown as Redis;
            service.addClient('analytics', secondClient);

            const analyticsService = service.withClient('analytics');
            await analyticsService.get('key');

            expect(spy).toHaveBeenCalledWith('analytics');
        });

        it('should handle nested withClient calls', async () => {
            const spy = jest.spyOn(service, 'getClient');
            const thirdClient = { ...mockRedisClient } as unknown as Redis;
            service.addClient('reports', thirdClient);

            const analyticsService = service.withClient('analytics');
            const reportsService = analyticsService.withClient('reports');

            await reportsService.set('key', 'val');
            expect(spy).toHaveBeenCalledWith('reports');
        });

        it('should correctly handle methods with optional middle arguments (increment)', async () => {
            // increment(key, amount?, clientName?)
            // We want to verify that `increment('k')` calls `increment('k', undefined, clientName)`
            // We can spy on the underlying _strings service or just mock getClient and inspect the flow?
            // Since we are testing RedisService integration, we can spy on "getClient".
            // But verify that the arguments passed to the underlying client are correct?
            // "increment" implementation calls "client.incrby(key, amount)" or "incr(key)"?
            // Let's look at RedisStringService implementation? We don't have it visible.
            // But we know RedisService delegates.
            
            // Let's spy on the 'increment' method of the service ITSELF?
            // No, the proxy wraps the service instance. Calling context.increment calls proxy handler -> service.increment.
            
            const spy = jest.spyOn(service, 'increment');
            const clientName = 'custom';
            service.addClient(clientName, mockRedisClient); // reuse mock
            const ctx = service.withClient(clientName);

            await ctx.increment('counter');
            expect(spy).toHaveBeenCalledWith('counter', undefined, clientName);

            await ctx.increment('counter', 5);
            expect(spy).toHaveBeenCalledWith('counter', 5, clientName);
        });

        it('should correctly handle hashIncrement', async () => {
            const spy = jest.spyOn(service, 'hashIncrement');
            const clientName = 'custom';
            service.addClient(clientName, mockRedisClient);
            const ctx = service.withClient(clientName);

            await ctx.hashIncrement('h', 'f');
            expect(spy).toHaveBeenCalledWith('h', 'f', undefined, clientName);

            await ctx.hashIncrement('h', 'f', 10);
            expect(spy).toHaveBeenCalledWith('h', 'f', 10, clientName);
        });

        it('should correctly handle scanKeys', async () => {
            const spy = jest.spyOn(service, 'scanKeys');
            const clientName = 'custom';
            service.addClient(clientName, mockRedisClient);
            const ctx = service.withClient(clientName);

            // Access generation
            const gen = ctx.scanKeys('*');
            await gen.next(); // trigger execution

            expect(spy).toHaveBeenCalledWith('*', undefined, clientName);
        });
    });
});
