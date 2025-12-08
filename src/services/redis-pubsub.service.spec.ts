import type { Cluster, Redis } from 'ioredis';

import { RedisPubSubService } from './redis-pubsub.service';

// eslint-disable-next-line max-lines-per-function
describe('RedisPubSubService', () => {
    let service: RedisPubSubService;
    let mockRedisClient: jest.Mocked<Partial<Redis>>;
    let mockDuplicatedClient: jest.Mocked<Partial<Redis>>;
    let clientsMap: Map<string, Cluster | Redis>;

    beforeEach(async () => {
        // Create mock for duplicated client (subscriber)
        mockDuplicatedClient = {
            status: 'ready',
            off: jest.fn(),
            on: jest.fn(),
            psubscribe: jest.fn().mockResolvedValue(1),
            punsubscribe: jest.fn().mockResolvedValue(1),
            quit: jest.fn().mockResolvedValue('OK'),
            subscribe: jest.fn().mockResolvedValue(1),
            unsubscribe: jest.fn().mockResolvedValue(1),
        };

        // Create mock for main client
        mockRedisClient = {
            duplicate: jest.fn().mockReturnValue(mockDuplicatedClient),
            publish: jest.fn().mockResolvedValue(1),
            quit: jest.fn().mockResolvedValue('OK'),
        };

        clientsMap = new Map<string, Cluster | Redis>();
        clientsMap.set('default', mockRedisClient as unknown as Redis);

        service = new RedisPubSubService(clientsMap);
    });

    afterEach(async () => {
        await service.onModuleDestroy();
    });

    describe('getSubscriberClient', () => {
        it('should create a dedicated subscriber client by duplicating main client', () => {
            const subscriber = service.getSubscriberClient('default');

            expect(mockRedisClient.duplicate).toHaveBeenCalled();
            expect(subscriber).toBe(mockDuplicatedClient);
        });

        it('should reuse existing subscriber client', () => {
            const subscriber1 = service.getSubscriberClient('default');
            const subscriber2 = service.getSubscriberClient('default');

            expect(mockRedisClient.duplicate).toHaveBeenCalledTimes(1);
            expect(subscriber1).toBe(subscriber2);
        });

        it('should throw if main client not found', () => {
            expect(() => service.getSubscriberClient('nonexistent')).toThrow(
                'Main Redis client "nonexistent" not found',
            );
        });
    });

    describe('subscribe', () => {
        it('should subscribe to a channel', async () => {
            const callback = jest.fn();

            await service.subscribe('test-channel', callback, 'default');

            expect(mockDuplicatedClient.subscribe).toHaveBeenCalledWith('test-channel');
            expect(mockDuplicatedClient.on).toHaveBeenCalledWith('message', expect.any(Function));
        });

        it('should subscribe to multiple channels', async () => {
            const callback = jest.fn();

            await service.subscribe(['channel1', 'channel2'], callback, 'default');

            expect(mockDuplicatedClient.subscribe).toHaveBeenCalledWith('channel1', 'channel2');
        });

        it('should return cleanup function', async () => {
            const callback = jest.fn();
            const cleanup = await service.subscribe('test-channel', callback, 'default');

            await cleanup();

            expect(mockDuplicatedClient.off).toHaveBeenCalledWith('message', expect.any(Function));
            expect(mockDuplicatedClient.unsubscribe).toHaveBeenCalledWith('test-channel');
        });
    });

    describe('psubscribe', () => {
        it('should pattern subscribe', async () => {
            const callback = jest.fn();

            await service.psubscribe('events:*', callback, 'default');

            expect(mockDuplicatedClient.psubscribe).toHaveBeenCalledWith('events:*');
            expect(mockDuplicatedClient.on).toHaveBeenCalledWith('pmessage', expect.any(Function));
        });

        it('should return cleanup function for pattern subscription', async () => {
            const callback = jest.fn();
            const cleanup = await service.psubscribe('events:*', callback, 'default');

            await cleanup();

            expect(mockDuplicatedClient.off).toHaveBeenCalledWith('pmessage', expect.any(Function));
            expect(mockDuplicatedClient.punsubscribe).toHaveBeenCalledWith('events:*');
        });
    });

    describe('publish', () => {
        it('should publish string message', async () => {
            const result = await service.publish('channel', 'hello', 'default');

            expect(mockRedisClient.publish).toHaveBeenCalledWith('channel', 'hello');
            expect(result).toBe(1);
        });

        it('should stringify object message', async () => {
            await service.publish('channel', { data: 'value' }, 'default');

            expect(mockRedisClient.publish).toHaveBeenCalledWith('channel', '{"data":"value"}');
        });

        it('should throw if client not found', async () => {
            await expect(service.publish('channel', 'message', 'nonexistent')).rejects.toThrow(
                'Redis client "nonexistent" not found',
            );
        });
    });

    describe('onModuleDestroy', () => {
        it('should close all subscriber connections', async () => {
            // Create a subscriber client first
            service.getSubscriberClient('default');

            await service.onModuleDestroy();

            expect(mockDuplicatedClient.quit).toHaveBeenCalled();
        });

        it('should execute cleanup functions', async () => {
            const callback = jest.fn();

            await service.subscribe('channel', callback, 'default');

            await service.onModuleDestroy();

            expect(mockDuplicatedClient.unsubscribe).toHaveBeenCalled();
        });
    });

    describe('getSubscriptionCount', () => {
        it('should return 0 when no subscriptions', () => {
            expect(service.getSubscriptionCount()).toBe(0);
        });

        it('should return count of ready subscriber clients', () => {
            service.getSubscriberClient('default');
            expect(service.getSubscriptionCount()).toBe(1);
        });
    });
});
