# @nam088/nestjs-redis

A NestJS wrapper for ioredis with advanced features

## Features

- Synchronous and asynchronous configuration support
- Multiple Redis connections support
- Redis Cluster mode support
- Automatic reconnection and lifecycle management
- Utility methods (JSON support, TTL, etc.)
- Full TypeScript support
- `@InjectRedis()` decorator for easy client injection
- Built-in health check endpoint

## Installation

```bash
npm install @nam088/nestjs-redis ioredis
# or
yarn add @nam088/nestjs-redis ioredis
# or
pnpm add @nam088/nestjs-redis ioredis
```

## Usage

### 1. Basic Configuration (Synchronous)

```typescript
import { Module } from '@nestjs/common';
import { RedisModule } from '@nam088/nestjs-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
      password: 'your-password', // optional
      db: 0, // optional, default is 0
    }),
  ],
})
export class AppModule {}
```

### 2. Asynchronous Configuration with ConfigService

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

## Using in Services

### Method 1: Using RedisService

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@nam088/nestjs-redis';

@Injectable()
export class UserService {
  constructor(private readonly redisService: RedisService) {}

  async cacheUser(userId: string, userData: any) {
    // Set with TTL of 1 hour
    await this.redisService.setWithTTL(
      `user:${userId}`,
      userData,
      3600
    );
  }

  async getUser(userId: string) {
    // Get and automatically parse JSON
    return await this.redisService.getJSON(`user:${userId}`);
  }

  async deleteUser(userId: string) {
    await this.redisService.delete(`user:${userId}`);
  }

  // Using named connection
  async cacheInSpecificRedis() {
    await this.redisService.setJSON(
      'key',
      { data: 'value' },
      'cache' // connection name
    );
  }
}
```

### Method 2: Direct Redis Client Injection

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
    // Use ioredis methods directly
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
    // Using named connection
    await this.cacheRedis.set(
      'products:list',
      JSON.stringify(products),
      'EX',
      300
    );
  }
}
```


### Method 3: Using Dynamic Client Context (Recommended for Multi-Tenant)

The `withClient()` method allows you to create a context-aware wrapper that automatically uses a specific Redis client for all subsequent operations. This is cleaner and safer than passing `clientName` to direct methods.

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@nam088/nestjs-redis';

@Injectable()
export class AnalyticsService {
  constructor(private readonly redisService: RedisService) {}

  async logEvent(userId: string, event: string) {
    // Switch completely to 'analytics' client context
    const analytics = this.redisService.withClient('analytics');
    
    // All calls here automatically use 'analytics' connection
    await analytics.listPushRight('events', JSON.stringify({ userId, event }));
    await analytics.increment(`stats:${event}`);
    
    // You can even chain contexts (though rarely needed)
    // const reports = analytics.withClient('reports');
  }
}
```

## Health Check

The module includes a built-in health check endpoint to monitor Redis connection status.

### Setup Health Check Module

```typescript
import { Module } from '@nestjs/common';
import { RedisHealthModule } from '@nam088/nestjs-redis';

@Module({
  imports: [
    RedisHealthModule,
  ],
})
export class AppModule {}
```

### Health Check Endpoints

The health check controller provides the following endpoints:

- `GET /health/redis` - Check all Redis connections
- `GET /health/redis/:name` - Check specific Redis connection by name

### Response Format

```typescript
// Success response
{
  "status": "up",
  "connections": {
    "default": "connected",
    "cache": "connected"
  }
}

// Failure response
{
  "status": "down",
  "connections": {
    "default": "connected",
    "cache": "disconnected"
  },
  "error": "Some Redis connections are down"
}
```

### Custom Health Check

You can also use the `RedisHealthIndicator` directly in your own health checks:

```typescript
import { Injectable } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@nam088/nestjs-redis';

@Injectable()
export class CustomHealthService {
  constructor(
    private health: HealthCheckService,
    private redisHealth: RedisHealthIndicator,
  ) {}

  @HealthCheck()
  async check() {
    return this.health.check([
      // With default 5 second timeout
      () => this.redisHealth.isHealthy('redis'),
      // With custom timeout
      () => this.redisHealth.isHealthy('redis', 'default', 3000),
      // Check all connections with timeout
      () => this.redisHealth.checkAllConnections('all-redis', 5000),
    ]);
  }
}
```

## API Reference

### RedisService Methods

#### Basic Methods

```typescript
// Get a string value
get(key: string, clientName?: string): Promise<string | null>

// Set a string value
set(key: string, value: string, clientName?: string): Promise<'OK'>

// Get Redis client
getClient(name?: string): Redis | Cluster

// Get all clients
getClients(): Map<string, Redis | Cluster>

// Get dynamic context (fluent API)
withClient(clientName: string): IRedisService
```

#### JSON Methods

```typescript
// Get and automatically parse JSON (throws error if parse fails)
getJSON<T = unknown>(key: string, clientName?: string): Promise<T | null>

// Get JSON with custom validation
getJSONValidated<T>(key: string, validator: (value: unknown) => T, clientName?: string): Promise<T | null>

// Set JSON value
setJSON(key: string, value: unknown, clientName?: string): Promise<'OK'>
```

> **Note:** `getJSON()` will throw an error if the stored value is not valid JSON. Use `get()` for raw string values.

#### Utility Methods

```typescript
// Set with TTL
setWithTTL(key: string, value: unknown, ttlSeconds: number, clientName?: string): Promise<'OK'>

// Delete one or multiple keys
delete(keys: string | string[], clientName?: string): Promise<number>

// Check if key exists
exists(key: string, clientName?: string): Promise<boolean>

// Get TTL of key
getTTL(key: string, clientName?: string): Promise<number>

// Increment value
increment(key: string, amount?: number, clientName?: string): Promise<number>

// Decrement value
decrement(key: string, amount?: number, clientName?: string): Promise<number>

// Flush database
flushDB(clientName?: string): Promise<'OK'>

// Scan keys matching pattern (production-safe)
scanKeysToArray(pattern: string, count?: number, clientName?: string): Promise<string[]>
```

#### Deprecated Methods

```typescript
// @deprecated - Use scanKeysToArray() instead
keys(pattern: string, clientName?: string): Promise<string[]>
```

> **Warning:** `keys()` is deprecated because it's O(N) and can block Redis on large databases. Use `scanKeysToArray()` for production-safe key scanning.

### Utility Methods Examples

```typescript
@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {}

  // Cache with TTL
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

  // Delete multiple keys (production-safe)
  async clearUserCache(userId: string) {
    const keys = await this.redisService.scanKeysToArray(`user:${userId}:*`);
    if (keys.length > 0) {
      await this.redisService.delete(keys);
    }
  }
}
```

## Real-World Examples

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
      3600, // 1 hour
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

## Configuration Options

All ioredis options are supported. Some common options:

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
  // ... and many other ioredis options
}
```

## Testing

The module includes comprehensive test coverage:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Run linter
npm run lint
```

## License

MIT

## Contributing

Contributions, issues, and feature requests are welcome!

## Author

**nam088**

---

Made with care by nam088
