# @nam088/nestjs-redis

🚀 Một thư viện NestJS wrapper cho ioredis với nhiều tính năng nâng cao

## ✨ Tính năng

- ✅ Hỗ trợ cấu hình đồng bộ và bất đồng bộ
- ✅ Hỗ trợ multiple Redis connections
- ✅ Hỗ trợ Redis Cluster mode
- ✅ Tự động reconnect và quản lý lifecycle
- ✅ Các utility methods tiện ích (JSON support, TTL, etc.)
- ✅ TypeScript support đầy đủ
- ✅ Decorator `@InjectRedis()` để inject client dễ dàng

## 📦 Cài đặt

```bash
npm install @nam088/nestjs-redis ioredis
# hoặc
yarn add @nam088/nestjs-redis ioredis
# hoặc
pnpm add @nam088/nestjs-redis ioredis
```

## 🚀 Cách sử dụng

### 1. Cấu hình cơ bản (Synchronous)

```typescript
import { Module } from '@nestjs/common';
import { RedisModule } from '@nam088/nestjs-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
      password: 'your-password', // optional
      db: 0, // optional, mặc định là 0
    }),
  ],
})
export class AppModule {}
```

### 2. Cấu hình bất đồng bộ (Asynchronous) với ConfigService

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nam088/nestjs-redis';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_DB'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 3. Multiple Redis Connections

```typescript
import { Module } from '@nestjs/common';
import { RedisModule } from '@nam088/nestjs-redis';

@Module({
  imports: [
    // Connection 1: Default
    RedisModule.forRoot({
      name: 'default',
      host: 'localhost',
      port: 6379,
    }),
    
    // Connection 2: Cache
    RedisModule.forRoot({
      name: 'cache',
      host: 'localhost',
      port: 6380,
    }),
    
    // Connection 3: Session
    RedisModule.forRoot({
      name: 'session',
      host: 'localhost',
      port: 6381,
    }),
  ],
})
export class AppModule {}
```

### 4. Redis Cluster Mode

```typescript
import { Module } from '@nestjs/common';
import { RedisModule } from '@nam088/nestjs-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      isCluster: true,
      clusterNodes: [
        { host: 'localhost', port: 7000 },
        { host: 'localhost', port: 7001 },
        { host: 'localhost', port: 7002 },
      ],
    }),
  ],
})
export class AppModule {}
```

## 💻 Sử dụng trong Service

### Cách 1: Sử dụng RedisService

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@nam088/nestjs-redis';

@Injectable()
export class UserService {
  constructor(private readonly redisService: RedisService) {}

  async cacheUser(userId: string, userData: any) {
    // Set với TTL 1 giờ
    await this.redisService.setWithTTL(
      `user:${userId}`,
      userData,
      3600
    );
  }

  async getUser(userId: string) {
    // Get và tự động parse JSON
    return await this.redisService.getJSON(`user:${userId}`);
  }

  async deleteUser(userId: string) {
    await this.redisService.delete(`user:${userId}`);
  }

  // Sử dụng named connection
  async cacheInSpecificRedis() {
    await this.redisService.setJSON(
      'key',
      { data: 'value' },
      'cache' // tên connection
    );
  }
}
```

### Cách 2: Inject trực tiếp Redis Client

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nam088/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class ProductService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRedis('cache') private readonly cacheRedis: Redis,
  ) {}

  async setProduct(productId: string, data: any) {
    // Sử dụng trực tiếp ioredis methods
    await this.redis.set(
      `product:${productId}`,
      JSON.stringify(data),
      'EX',
      3600
    );
  }

  async getProduct(productId: string) {
    const data = await this.redis.get(`product:${productId}`);
    return data ? JSON.parse(data) : null;
  }

  async cacheProductList(products: any[]) {
    // Sử dụng named connection
    await this.cacheRedis.set(
      'products:list',
      JSON.stringify(products),
      'EX',
      300
    );
  }
}
```

## 🛠 API Reference

### RedisService Methods

#### Các phương thức cơ bản

```typescript
// Lấy Redis client
getClient(name?: string): Redis | Cluster

// Lấy tất cả clients
getClients(): Map<string, Redis | Cluster>
```

#### Utility Methods

```typescript
// Set với TTL
setWithTTL(key: string, value: any, ttlSeconds: number, clientName?: string): Promise<'OK'>

// Get và parse JSON tự động
getJSON<T>(key: string, clientName?: string): Promise<T | null>

// Set JSON value
setJSON(key: string, value: any, clientName?: string): Promise<'OK'>

// Delete một hoặc nhiều keys
delete(keys: string | string[], clientName?: string): Promise<number>

// Check key có tồn tại không
exists(key: string, clientName?: string): Promise<boolean>

// Get TTL của key
getTTL(key: string, clientName?: string): Promise<number>

// Increment giá trị
increment(key: string, amount?: number, clientName?: string): Promise<number>

// Decrement giá trị
decrement(key: string, amount?: number, clientName?: string): Promise<number>

// Flush database
flushDB(clientName?: string): Promise<'OK'>

// Get keys matching pattern
keys(pattern: string, clientName?: string): Promise<string[]>
```

### Ví dụ sử dụng Utility Methods

```typescript
@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {}

  // Cache với TTL
  async cacheData(key: string, data: any, ttl: number = 3600) {
    await this.redisService.setWithTTL(key, data, ttl);
  }

  // Get cached data
  async getCachedData<T>(key: string): Promise<T | null> {
    return await this.redisService.getJSON<T>(key);
  }

  // Increment counter
  async incrementPageView(pageId: string) {
    return await this.redisService.increment(`page:${pageId}:views`);
  }

  // Check if exists
  async hasCache(key: string): Promise<boolean> {
    return await this.redisService.exists(key);
  }

  // Get TTL
  async getCacheTTL(key: string): Promise<number> {
    return await this.redisService.getTTL(key);
  }

  // Delete multiple keys
  async clearUserCache(userId: string) {
    const keys = await this.redisService.keys(`user:${userId}:*`);
    if (keys.length > 0) {
      await this.redisService.delete(keys);
    }
  }
}
```

## 🎯 Ví dụ thực tế

### Session Management

```typescript
@Injectable()
export class SessionService {
  constructor(
    @InjectRedis('session') private readonly sessionRedis: Redis,
  ) {}

  async createSession(userId: string, sessionData: any): Promise<string> {
    const sessionId = randomUUID();
    await this.sessionRedis.setex(
      `session:${sessionId}`,
      3600, // 1 giờ
      JSON.stringify({ userId, ...sessionData })
    );
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.sessionRedis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.sessionRedis.del(`session:${sessionId}`);
  }
}
```

### Rate Limiting

```typescript
@Injectable()
export class RateLimitService {
  constructor(private readonly redisService: RedisService) {}

  async checkRateLimit(
    userId: string,
    limit: number = 100,
    windowSeconds: number = 60
  ): Promise<boolean> {
    const key = `rate_limit:${userId}`;
    const current = await this.redisService.increment(key);
    
    if (current === 1) {
      // First request, set TTL
      const client = this.redisService.getClient();
      await client.expire(key, windowSeconds);
    }
    
    return current <= limit;
  }
}
```

### Caching with Decorator Pattern

```typescript
@Injectable()
export class PostService {
  constructor(
    private readonly redisService: RedisService,
    private readonly postRepository: PostRepository,
  ) {}

  async getPost(postId: string) {
    // Try cache first
    const cached = await this.redisService.getJSON(`post:${postId}`);
    if (cached) {
      return cached;
    }

    // Cache miss, get from database
    const post = await this.postRepository.findById(postId);
    
    if (post) {
      // Cache for 10 minutes
      await this.redisService.setWithTTL(`post:${postId}`, post, 600);
    }

    return post;
  }

  async updatePost(postId: string, data: any) {
    const updatedPost = await this.postRepository.update(postId, data);
    
    // Invalidate cache
    await this.redisService.delete(`post:${postId}`);
    
    return updatedPost;
  }
}
```

## 🔧 Configuration Options

Tất cả options của ioredis đều được hỗ trợ. Một số options thông dụng:

```typescript
interface RedisModuleOptions {
  // Basic
  host?: string;              // default: 'localhost'
  port?: number;              // default: 6379
  password?: string;
  db?: number;                // default: 0
  
  // Connection
  name?: string;              // connection name, default: 'default'
  connectTimeout?: number;    // default: 10000ms
  keepAlive?: number;         // default: 30000ms
  
  // Cluster
  isCluster?: boolean;        // enable cluster mode
  clusterNodes?: Array<{ host: string; port: number }>;
  
  // Retry
  retryStrategy?: (times: number) => number | null;
  maxRetriesPerRequest?: number;
  
  // Other ioredis options
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
  // ... và nhiều options khác từ ioredis
}
```

## 📝 License

MIT

## 🤝 Contributing

Contributions, issues và feature requests đều được chào đón!

## 👨‍💻 Author

**nam088**

---

Made with ❤️ by nam088

