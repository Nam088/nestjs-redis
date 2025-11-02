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
            decr: jest.fn(),
            decrby: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            flushdb: jest.fn(),
            get: jest.fn(),
            incr: jest.fn(),
            incrby: jest.fn(),
            keys: jest.fn(),
            quit: jest.fn(),
            set: jest.fn(),
            setex: jest.fn(),
            ttl: jest.fn(),
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
});
