import { Cacheable, CacheEvict } from './cacheable.decorator';

describe('Cacheable Decorator', () => {
    let mockRedisService: any;

    beforeEach(() => {
        mockRedisService = {
            get: jest.fn(),
            set: jest.fn(),
            setWithTTL: jest.fn(),
            delete: jest.fn(),
            scanKeysToArray: jest.fn(),
        };
    });

    describe('@Cacheable', () => {
        it('should cache method result', async () => {
            mockRedisService.get.mockResolvedValue(null);
            mockRedisService.set.mockResolvedValue('OK');

            class TestService {
                redisService = mockRedisService;
                callCount = 0;

                @Cacheable({ key: 'test-key' })
                async getValue(): Promise<string> {
                    this.callCount++;

                    return 'result';
                }
            }

            const service = new TestService();
            const result = await service.getValue();

            expect(result).toBe('result');
            expect(mockRedisService.get).toHaveBeenCalledWith('cache:test-key', 'default');
            expect(mockRedisService.set).toHaveBeenCalledWith('cache:test-key', '"result"', 'default');
        });

        it('should return cached value on cache hit', async () => {
            mockRedisService.get.mockResolvedValue('"cached-result"');

            class TestService {
                redisService = mockRedisService;
                callCount = 0;

                @Cacheable({ key: 'test-key' })
                async getValue(): Promise<string> {
                    this.callCount++;

                    return 'fresh-result';
                }
            }

            const service = new TestService();
            const result = await service.getValue();

            expect(result).toBe('cached-result');
            expect(service.callCount).toBe(0); // Method not called
        });

        it('should use TTL when specified', async () => {
            mockRedisService.get.mockResolvedValue(null);
            mockRedisService.setWithTTL.mockResolvedValue('OK');

            class TestService {
                redisService = mockRedisService;

                @Cacheable({ key: 'test-key', ttl: 300 })
                async getValue(): Promise<string> {
                    return 'result';
                }
            }

            const service = new TestService();
            await service.getValue();

            expect(mockRedisService.setWithTTL).toHaveBeenCalledWith('cache:test-key', '"result"', 300, 'default');
        });

        it('should interpolate key with positional arguments', async () => {
            mockRedisService.get.mockResolvedValue(null);
            mockRedisService.set.mockResolvedValue('OK');

            class TestService {
                redisService = mockRedisService;

                @Cacheable({ key: 'user:{{0}}' })
                async getUser(id: string): Promise<object> {
                    return { id };
                }
            }

            const service = new TestService();
            await service.getUser('123');

            expect(mockRedisService.get).toHaveBeenCalledWith('cache:user:123', 'default');
        });

        it('should use key function', async () => {
            mockRedisService.get.mockResolvedValue(null);
            mockRedisService.set.mockResolvedValue('OK');

            class TestService {
                redisService = mockRedisService;

                @Cacheable({ key: (id: string, type: string) => `user:${id}:${type}` })
                async getUser(id: string, type: string): Promise<object> {
                    return { id, type };
                }
            }

            const service = new TestService();
            await service.getUser('123', 'admin');

            expect(mockRedisService.get).toHaveBeenCalledWith('cache:user:123:admin', 'default');
        });

        it('should skip caching when unless condition is true', async () => {
            mockRedisService.get.mockResolvedValue(null);

            class TestService {
                redisService = mockRedisService;

                @Cacheable({ key: 'test-key', unless: (result) => result === null })
                async getValue(): Promise<null> {
                    return null;
                }
            }

            const service = new TestService();
            await service.getValue();

            expect(mockRedisService.set).not.toHaveBeenCalled();
        });

        it('should execute method if RedisService not found', async () => {
            class TestService {
                callCount = 0;

                @Cacheable({ key: 'test-key' })
                async getValue(): Promise<string> {
                    this.callCount++;

                    return 'result';
                }
            }

            const service = new TestService();
            const result = await service.getValue();

            expect(result).toBe('result');
            expect(service.callCount).toBe(1);
        });
    });

    describe('@CacheEvict', () => {
        it('should evict cache after method execution', async () => {
            mockRedisService.delete.mockResolvedValue(1);

            class TestService {
                redisService = mockRedisService;

                @CacheEvict({ key: 'user:{{0}}' })
                async updateUser(id: string): Promise<void> {
                    // Update logic
                }
            }

            const service = new TestService();
            await service.updateUser('123');

            expect(mockRedisService.delete).toHaveBeenCalledWith(['cache:user:123'], 'default');
        });

        it('should evict before method execution when beforeInvocation is true', async () => {
            const callOrder: string[] = [];

            mockRedisService.delete.mockImplementation(() => {
                callOrder.push('evict');

                return Promise.resolve(1);
            });

            class TestService {
                redisService = mockRedisService;

                @CacheEvict({ key: 'test-key', beforeInvocation: true })
                async doSomething(): Promise<void> {
                    callOrder.push('method');
                }
            }

            const service = new TestService();
            await service.doSomething();

            expect(callOrder).toEqual(['evict', 'method']);
        });

        it('should evict multiple keys', async () => {
            mockRedisService.delete.mockResolvedValue(2);

            class TestService {
                redisService = mockRedisService;

                @CacheEvict({ key: ['user:{{0}}', 'users:list'] })
                async updateUser(id: string): Promise<void> {
                    // Update logic
                }
            }

            const service = new TestService();
            await service.updateUser('123');

            expect(mockRedisService.delete).toHaveBeenCalledWith(['cache:user:123', 'cache:users:list'], 'default');
        });

        it('should evict all matching entries when allEntries is true', async () => {
            mockRedisService.scanKeysToArray.mockResolvedValue(['cache:user:1', 'cache:user:2']);
            mockRedisService.delete.mockResolvedValue(2);

            class TestService {
                redisService = mockRedisService;

                @CacheEvict({ key: 'user:*', allEntries: true })
                async clearUsers(): Promise<void> {
                    // Clear logic
                }
            }

            const service = new TestService();
            await service.clearUsers();

            expect(mockRedisService.scanKeysToArray).toHaveBeenCalledWith('cache:user:*', 100, 'default');
            expect(mockRedisService.delete).toHaveBeenCalledWith(['cache:user:1', 'cache:user:2'], 'default');
        });
    });
});
