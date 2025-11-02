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
        // Create mock Redis client
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

        it('should add a client', () => {
            const newClient = {} as Redis;

            service.addClient('test', newClient);
            expect(service.getClient('test')).toBe(newClient);
        });

        it('should get a client by name', () => {
            const client = service.getClient('default');

            expect(client).toBe(mockRedisClient);
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

    describe('setWithTTL', () => {
        it('should set string value with TTL', async () => {
            mockRedisClient.setex.mockResolvedValue('OK');

            const result = await service.setWithTTL('key', 'value', 3600);

            expect(mockRedisClient.setex).toHaveBeenCalledWith('key', 3600, 'value');
            expect(result).toBe('OK');
        });

        it('should serialize object value with TTL', async () => {
            mockRedisClient.setex.mockResolvedValue('OK');
            const obj = { name: 'test', age: 25 };

            await service.setWithTTL('key', obj, 3600);

            expect(mockRedisClient.setex).toHaveBeenCalledWith('key', 3600, JSON.stringify(obj));
        });

        it('should use specified client name', async () => {
            const customClient = {
                setex: jest.fn().mockResolvedValue('OK'),
            } as unknown as jest.Mocked<Redis>;

            service.addClient('custom', customClient);

            await service.setWithTTL('key', 'value', 3600, 'custom');

            expect(customClient.setex).toHaveBeenCalledWith('key', 3600, 'value');
        });
    });

    describe('getJSON', () => {
        it('should return null when key does not exist', async () => {
            mockRedisClient.get.mockResolvedValue(null);

            const result = await service.getJSON('key');

            expect(result).toBeNull();
            expect(mockRedisClient.get).toHaveBeenCalledWith('key');
        });

        it('should parse and return JSON value', async () => {
            const obj = { name: 'test', age: 25 };

            mockRedisClient.get.mockResolvedValue(JSON.stringify(obj));

            const result = await service.getJSON('key');

            expect(result).toEqual(obj);
        });

        it('should return raw value if JSON parse fails', async () => {
            mockRedisClient.get.mockResolvedValue('not-json');

            const result = await service.getJSON('key');

            expect(result).toBe('not-json');
        });

        it('should use specified client name', async () => {
            const customClient = {
                get: jest.fn().mockResolvedValue(JSON.stringify({ test: true })),
            } as unknown as jest.Mocked<Redis>;

            service.addClient('custom', customClient);

            await service.getJSON('key', 'custom');

            expect(customClient.get).toHaveBeenCalledWith('key');
        });
    });

    describe('setJSON', () => {
        it('should stringify and set JSON value', async () => {
            mockRedisClient.set.mockResolvedValue('OK');
            const obj = { name: 'test', age: 25 };

            const result = await service.setJSON('key', obj);

            expect(mockRedisClient.set).toHaveBeenCalledWith('key', JSON.stringify(obj));
            expect(result).toBe('OK');
        });
    });

    describe('delete', () => {
        it('should delete single key', async () => {
            mockRedisClient.del.mockResolvedValue(1);

            const result = await service.delete('key');

            expect(mockRedisClient.del).toHaveBeenCalledWith('key');
            expect(result).toBe(1);
        });

        it('should delete multiple keys', async () => {
            mockRedisClient.del.mockResolvedValue(3);

            const result = await service.delete(['key1', 'key2', 'key3']);

            expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
            expect(result).toBe(3);
        });
    });

    describe('exists', () => {
        it('should return true when key exists', async () => {
            mockRedisClient.exists.mockResolvedValue(1);

            const result = await service.exists('key');

            expect(result).toBe(true);
            expect(mockRedisClient.exists).toHaveBeenCalledWith('key');
        });

        it('should return false when key does not exist', async () => {
            mockRedisClient.exists.mockResolvedValue(0);

            const result = await service.exists('key');

            expect(result).toBe(false);
        });
    });

    describe('getTTL', () => {
        it('should return TTL in seconds', async () => {
            mockRedisClient.ttl.mockResolvedValue(3600);

            const result = await service.getTTL('key');

            expect(result).toBe(3600);
            expect(mockRedisClient.ttl).toHaveBeenCalledWith('key');
        });

        it('should return -1 for keys without expiry', async () => {
            mockRedisClient.ttl.mockResolvedValue(-1);

            const result = await service.getTTL('key');

            expect(result).toBe(-1);
        });

        it('should return -2 for non-existent keys', async () => {
            mockRedisClient.ttl.mockResolvedValue(-2);

            const result = await service.getTTL('key');

            expect(result).toBe(-2);
        });
    });

    describe('increment', () => {
        it('should increment by 1 by default', async () => {
            mockRedisClient.incr.mockResolvedValue(1);

            const result = await service.increment('counter');

            expect(mockRedisClient.incr).toHaveBeenCalledWith('counter');
            expect(result).toBe(1);
        });

        it('should increment by specified amount', async () => {
            mockRedisClient.incrby.mockResolvedValue(10);

            const result = await service.increment('counter', 10);

            expect(mockRedisClient.incrby).toHaveBeenCalledWith('counter', 10);
            expect(result).toBe(10);
        });
    });

    describe('decrement', () => {
        it('should decrement by 1 by default', async () => {
            mockRedisClient.decr.mockResolvedValue(9);

            const result = await service.decrement('counter');

            expect(mockRedisClient.decr).toHaveBeenCalledWith('counter');
            expect(result).toBe(9);
        });

        it('should decrement by specified amount', async () => {
            mockRedisClient.decrby.mockResolvedValue(0);

            const result = await service.decrement('counter', 10);

            expect(mockRedisClient.decrby).toHaveBeenCalledWith('counter', 10);
            expect(result).toBe(0);
        });
    });

    describe('flushDB', () => {
        it('should flush the database', async () => {
            mockRedisClient.flushdb.mockResolvedValue('OK');

            const result = await service.flushDB();

            expect(mockRedisClient.flushdb).toHaveBeenCalled();
            expect(result).toBe('OK');
        });
    });

    describe('keys', () => {
        it('should return matching keys', async () => {
            const mockKeys = ['user:1', 'user:2', 'user:3'];

            mockRedisClient.keys.mockResolvedValue(mockKeys);

            const result = await service.keys('user:*');

            expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
            expect(result).toEqual(mockKeys);
        });

        it('should return empty array when no keys match', async () => {
            mockRedisClient.keys.mockResolvedValue([]);

            const result = await service.keys('nonexistent:*');

            expect(result).toEqual([]);
        });
    });

    describe('onModuleDestroy', () => {
        it('should close all connections', async () => {
            mockRedisClient.quit.mockResolvedValue('OK');

            const client1 = {
                quit: jest.fn().mockResolvedValue('OK'),
            } as unknown as jest.Mocked<Redis>;

            const client2 = {
                quit: jest.fn().mockResolvedValue('OK'),
            } as unknown as jest.Mocked<Redis>;

            service.addClient('client1', client1);
            service.addClient('client2', client2);

            await service.onModuleDestroy();

            expect(mockRedisClient.quit).toHaveBeenCalled();
            expect(client1.quit).toHaveBeenCalled();
            expect(client2.quit).toHaveBeenCalled();
            expect(service.getClients().size).toBe(0);
        });

        it('should handle errors when closing connections', async () => {
            const errorClient = {
                quit: jest.fn().mockRejectedValue(new Error('Connection error')),
            } as unknown as jest.Mocked<Redis>;

            // Clear default client first
            service.getClients().clear();
            service.addClient('error-client', errorClient);

            // Should not throw
            await expect(service.onModuleDestroy()).resolves.toBeUndefined();
        });
    });

    describe('expire', () => {
        it('should set expiration on key', async () => {
            mockRedisClient.expire.mockResolvedValue(1);

            const result = await service.expire('key', 3600);

            expect(mockRedisClient.expire).toHaveBeenCalledWith('key', 3600);
            expect(result).toBe(1);
        });

        it('should return 0 if key does not exist', async () => {
            mockRedisClient.expire.mockResolvedValue(0);

            const result = await service.expire('nonexistent', 3600);

            expect(result).toBe(0);
        });
    });

    describe('persist', () => {
        it('should remove expiration from key', async () => {
            mockRedisClient.persist.mockResolvedValue(1);

            const result = await service.persist('key');

            expect(mockRedisClient.persist).toHaveBeenCalledWith('key');
            expect(result).toBe(1);
        });

        it('should return 0 if key has no expiration', async () => {
            mockRedisClient.persist.mockResolvedValue(0);

            const result = await service.persist('key');

            expect(result).toBe(0);
        });
    });

    describe('Set Operations', () => {
        describe('setAdd', () => {
            it('should add single member to set', async () => {
                mockRedisClient.sadd.mockResolvedValue(1);

                const result = await service.setAdd('myset', 'member1');

                expect(mockRedisClient.sadd).toHaveBeenCalledWith('myset', 'member1');
                expect(result).toBe(1);
            });

            it('should add multiple members to set', async () => {
                mockRedisClient.sadd.mockResolvedValue(3);

                const result = await service.setAdd('myset', ['member1', 'member2', 'member3']);

                expect(mockRedisClient.sadd).toHaveBeenCalledWith('myset', 'member1', 'member2', 'member3');
                expect(result).toBe(3);
            });
        });

        describe('setRemove', () => {
            it('should remove single member from set', async () => {
                mockRedisClient.srem.mockResolvedValue(1);

                const result = await service.setRemove('myset', 'member1');

                expect(mockRedisClient.srem).toHaveBeenCalledWith('myset', 'member1');
                expect(result).toBe(1);
            });

            it('should remove multiple members from set', async () => {
                mockRedisClient.srem.mockResolvedValue(2);

                const result = await service.setRemove('myset', ['member1', 'member2']);

                expect(mockRedisClient.srem).toHaveBeenCalledWith('myset', 'member1', 'member2');
                expect(result).toBe(2);
            });
        });

        describe('setMembers', () => {
            it('should return all members of set', async () => {
                const members = ['member1', 'member2', 'member3'];

                mockRedisClient.smembers.mockResolvedValue(members);

                const result = await service.setMembers('myset');

                expect(mockRedisClient.smembers).toHaveBeenCalledWith('myset');
                expect(result).toEqual(members);
            });
        });

        describe('setIsMember', () => {
            it('should return true if member exists', async () => {
                mockRedisClient.sismember.mockResolvedValue(1);

                const result = await service.setIsMember('myset', 'member1');

                expect(mockRedisClient.sismember).toHaveBeenCalledWith('myset', 'member1');
                expect(result).toBe(true);
            });

            it('should return false if member does not exist', async () => {
                mockRedisClient.sismember.mockResolvedValue(0);

                const result = await service.setIsMember('myset', 'member1');

                expect(result).toBe(false);
            });
        });

        describe('setCount', () => {
            it('should return number of members in set', async () => {
                mockRedisClient.scard.mockResolvedValue(5);

                const result = await service.setCount('myset');

                expect(mockRedisClient.scard).toHaveBeenCalledWith('myset');
                expect(result).toBe(5);
            });
        });
    });

    describe('List Operations', () => {
        describe('listPushLeft', () => {
            it('should push single value to left', async () => {
                mockRedisClient.lpush.mockResolvedValue(1);

                const result = await service.listPushLeft('mylist', 'value1');

                expect(mockRedisClient.lpush).toHaveBeenCalledWith('mylist', 'value1');
                expect(result).toBe(1);
            });

            it('should push multiple values to left', async () => {
                mockRedisClient.lpush.mockResolvedValue(3);

                const result = await service.listPushLeft('mylist', ['value1', 'value2', 'value3']);

                expect(mockRedisClient.lpush).toHaveBeenCalledWith('mylist', 'value1', 'value2', 'value3');
                expect(result).toBe(3);
            });
        });

        describe('listPushRight', () => {
            it('should push single value to right', async () => {
                mockRedisClient.rpush.mockResolvedValue(1);

                const result = await service.listPushRight('mylist', 'value1');

                expect(mockRedisClient.rpush).toHaveBeenCalledWith('mylist', 'value1');
                expect(result).toBe(1);
            });

            it('should push multiple values to right', async () => {
                mockRedisClient.rpush.mockResolvedValue(3);

                const result = await service.listPushRight('mylist', ['value1', 'value2', 'value3']);

                expect(mockRedisClient.rpush).toHaveBeenCalledWith('mylist', 'value1', 'value2', 'value3');
                expect(result).toBe(3);
            });
        });

        describe('listPopLeft', () => {
            it('should pop value from left', async () => {
                (mockRedisClient.lpop as jest.Mock).mockResolvedValue('value1');

                const result = await service.listPopLeft('mylist');

                expect(mockRedisClient.lpop).toHaveBeenCalledWith('mylist');
                expect(result).toBe('value1');
            });

            it('should return null if list is empty', async () => {
                (mockRedisClient.lpop as jest.Mock).mockResolvedValue(null);

                const result = await service.listPopLeft('mylist');

                expect(result).toBeNull();
            });
        });

        describe('listPopRight', () => {
            it('should pop value from right', async () => {
                (mockRedisClient.rpop as jest.Mock).mockResolvedValue('value1');

                const result = await service.listPopRight('mylist');

                expect(mockRedisClient.rpop).toHaveBeenCalledWith('mylist');
                expect(result).toBe('value1');
            });

            it('should return null if list is empty', async () => {
                (mockRedisClient.rpop as jest.Mock).mockResolvedValue(null);

                const result = await service.listPopRight('mylist');

                expect(result).toBeNull();
            });
        });

        describe('listRange', () => {
            it('should return range of elements', async () => {
                const values = ['value1', 'value2', 'value3'];

                mockRedisClient.lrange.mockResolvedValue(values);

                const result = await service.listRange('mylist', 0, -1);

                expect(mockRedisClient.lrange).toHaveBeenCalledWith('mylist', 0, -1);
                expect(result).toEqual(values);
            });
        });

        describe('listLength', () => {
            it('should return length of list', async () => {
                mockRedisClient.llen.mockResolvedValue(5);

                const result = await service.listLength('mylist');

                expect(mockRedisClient.llen).toHaveBeenCalledWith('mylist');
                expect(result).toBe(5);
            });
        });
    });

    describe('Hash Operations', () => {
        describe('hashSet', () => {
            it('should set hash fields', async () => {
                mockRedisClient.hset.mockResolvedValue(2);
                const fields = { field1: 'value1', field2: 'value2' };

                const result = await service.hashSet('myhash', fields);

                expect(mockRedisClient.hset).toHaveBeenCalledWith('myhash', fields);
                expect(result).toBe(2);
            });
        });

        describe('hashGet', () => {
            it('should get hash field value', async () => {
                mockRedisClient.hget.mockResolvedValue('value1');

                const result = await service.hashGet('myhash', 'field1');

                expect(mockRedisClient.hget).toHaveBeenCalledWith('myhash', 'field1');
                expect(result).toBe('value1');
            });

            it('should return null if field does not exist', async () => {
                mockRedisClient.hget.mockResolvedValue(null);

                const result = await service.hashGet('myhash', 'field1');

                expect(result).toBeNull();
            });
        });

        describe('hashGetAll', () => {
            it('should get all hash fields and values', async () => {
                const hash = { field1: 'value1', field2: 'value2' };

                mockRedisClient.hgetall.mockResolvedValue(hash);

                const result = await service.hashGetAll('myhash');

                expect(mockRedisClient.hgetall).toHaveBeenCalledWith('myhash');
                expect(result).toEqual(hash);
            });
        });

        describe('hashDelete', () => {
            it('should delete single hash field', async () => {
                mockRedisClient.hdel.mockResolvedValue(1);

                const result = await service.hashDelete('myhash', 'field1');

                expect(mockRedisClient.hdel).toHaveBeenCalledWith('myhash', 'field1');
                expect(result).toBe(1);
            });

            it('should delete multiple hash fields', async () => {
                mockRedisClient.hdel.mockResolvedValue(2);

                const result = await service.hashDelete('myhash', ['field1', 'field2']);

                expect(mockRedisClient.hdel).toHaveBeenCalledWith('myhash', 'field1', 'field2');
                expect(result).toBe(2);
            });
        });

        describe('hashExists', () => {
            it('should return true if field exists', async () => {
                mockRedisClient.hexists.mockResolvedValue(1);

                const result = await service.hashExists('myhash', 'field1');

                expect(mockRedisClient.hexists).toHaveBeenCalledWith('myhash', 'field1');
                expect(result).toBe(true);
            });

            it('should return false if field does not exist', async () => {
                mockRedisClient.hexists.mockResolvedValue(0);

                const result = await service.hashExists('myhash', 'field1');

                expect(result).toBe(false);
            });
        });

        describe('hashKeys', () => {
            it('should return all field names', async () => {
                const keys = ['field1', 'field2', 'field3'];

                mockRedisClient.hkeys.mockResolvedValue(keys);

                const result = await service.hashKeys('myhash');

                expect(mockRedisClient.hkeys).toHaveBeenCalledWith('myhash');
                expect(result).toEqual(keys);
            });
        });

        describe('hashLength', () => {
            it('should return number of fields', async () => {
                mockRedisClient.hlen.mockResolvedValue(5);

                const result = await service.hashLength('myhash');

                expect(mockRedisClient.hlen).toHaveBeenCalledWith('myhash');
                expect(result).toBe(5);
            });
        });
    });

    describe('Sorted Set Operations', () => {
        describe('sortedSetAdd', () => {
            it('should add members with scores', async () => {
                (mockRedisClient.zadd as jest.Mock).mockResolvedValue(2);

                const members = [
                    { member: 'member1', score: 1 },
                    { member: 'member2', score: 2 },
                ];

                const result = await service.sortedSetAdd('myzset', members);

                expect(mockRedisClient.zadd).toHaveBeenCalledWith('myzset', 1, 'member1', 2, 'member2');
                expect(result).toBe(2);
            });
        });

        describe('sortedSetRange', () => {
            it('should return range of members', async () => {
                const members = ['member1', 'member2', 'member3'];

                mockRedisClient.zrange.mockResolvedValue(members);

                const result = await service.sortedSetRange('myzset', 0, -1);

                expect(mockRedisClient.zrange).toHaveBeenCalledWith('myzset', 0, -1);
                expect(result).toEqual(members);
            });
        });

        describe('sortedSetRangeByScore', () => {
            it('should return range of members by score', async () => {
                const members = ['member1', 'member2'];

                mockRedisClient.zrangebyscore.mockResolvedValue(members);

                const result = await service.sortedSetRangeByScore('myzset', 0, 100);

                expect(mockRedisClient.zrangebyscore).toHaveBeenCalledWith('myzset', 0, 100);
                expect(result).toEqual(members);
            });
        });

        describe('sortedSetRemove', () => {
            it('should remove single member', async () => {
                mockRedisClient.zrem.mockResolvedValue(1);

                const result = await service.sortedSetRemove('myzset', 'member1');

                expect(mockRedisClient.zrem).toHaveBeenCalledWith('myzset', 'member1');
                expect(result).toBe(1);
            });

            it('should remove multiple members', async () => {
                mockRedisClient.zrem.mockResolvedValue(2);

                const result = await service.sortedSetRemove('myzset', ['member1', 'member2']);

                expect(mockRedisClient.zrem).toHaveBeenCalledWith('myzset', 'member1', 'member2');
                expect(result).toBe(2);
            });
        });

        describe('sortedSetScore', () => {
            it('should return score of member', async () => {
                mockRedisClient.zscore.mockResolvedValue('10');

                const result = await service.sortedSetScore('myzset', 'member1');

                expect(mockRedisClient.zscore).toHaveBeenCalledWith('myzset', 'member1');
                expect(result).toBe('10');
            });

            it('should return null if member does not exist', async () => {
                mockRedisClient.zscore.mockResolvedValue(null);

                const result = await service.sortedSetScore('myzset', 'member1');

                expect(result).toBeNull();
            });
        });

        describe('sortedSetCount', () => {
            it('should return number of members', async () => {
                mockRedisClient.zcard.mockResolvedValue(5);

                const result = await service.sortedSetCount('myzset');

                expect(mockRedisClient.zcard).toHaveBeenCalledWith('myzset');
                expect(result).toBe(5);
            });
        });
    });

    describe('Pub/Sub Operations', () => {
        describe('publish', () => {
            it('should publish message to channel', async () => {
                mockRedisClient.publish.mockResolvedValue(3);

                const result = await service.publish('mychannel', 'hello');

                expect(mockRedisClient.publish).toHaveBeenCalledWith('mychannel', 'hello');
                expect(result).toBe(3);
            });
        });
    });

    describe('Multi-Key Operations', () => {
        describe('mget', () => {
            it('should get multiple values', async () => {
                const values = ['value1', 'value2', null];

                mockRedisClient.mget.mockResolvedValue(values);

                const result = await service.mget(['key1', 'key2', 'key3']);

                expect(mockRedisClient.mget).toHaveBeenCalledWith('key1', 'key2', 'key3');
                expect(result).toEqual(values);
            });
        });

        describe('mset', () => {
            it('should set multiple key-value pairs', async () => {
                mockRedisClient.mset.mockResolvedValue('OK');

                const keyValues = { key1: 'value1', key2: 'value2' };

                const result = await service.mset(keyValues);

                expect(mockRedisClient.mset).toHaveBeenCalledWith('key1', 'value1', 'key2', 'value2');
                expect(result).toBe('OK');
            });
        });
    });

    describe('Key Management Operations', () => {
        describe('rename', () => {
            it('should rename key', async () => {
                mockRedisClient.rename.mockResolvedValue('OK');

                const result = await service.rename('oldkey', 'newkey');

                expect(mockRedisClient.rename).toHaveBeenCalledWith('oldkey', 'newkey');
                expect(result).toBe('OK');
            });
        });

        describe('type', () => {
            it('should return type of key', async () => {
                mockRedisClient.type.mockResolvedValue('string');

                const result = await service.type('mykey');

                expect(mockRedisClient.type).toHaveBeenCalledWith('mykey');
                expect(result).toBe('string');
            });
        });
    });
});
