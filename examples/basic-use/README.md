# Basic Usage Example

This example demonstrates how to use `@nam088/nestjs-redis` with environment variables configuration.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**

Copy the `.env.example` file to `.env` and update with your Redis credentials:

```bash
cp .env.example .env
```

Edit `.env` file:
```env
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_USERNAME=default
REDIS_KEY_PREFIX=example:
```

3. **Run the application:**
```bash
npm run start:dev
```

The application will start on http://localhost:3000

4. **Access Swagger API Documentation:**

Open your browser and navigate to:
```
http://localhost:3000/api
```

You'll see an interactive API documentation where you can test all endpoints directly from your browser! 🎉

## Features Demonstrated

- ✅ Environment variables configuration with `@nestjs/config`
- ✅ Redis connection using `RedisModule.forRootAsync()`
- ✅ **Swagger/OpenAPI documentation** for interactive API testing
- ✅ Multiple controllers showcasing different Redis operations:
  - `CacheController` - Basic key-value operations
  - `CounterController` - Increment/decrement operations
  - `ListController` - List operations
  - `UserController` - Complex object storage
  - `HealthController` - Redis health checks

## API Endpoints

All endpoints are documented in Swagger at `http://localhost:3000/api`

### Cache Operations
- `GET /cache/:key` - Get cached value
- `POST /cache/:key` - Set cached value with 1 hour TTL
- `DELETE /cache/:key` - Delete cached value

### Counter Operations
- `GET /counter/:key` - Get counter value
- `POST /counter/:key/increment` - Increment counter

### List Operations
- `GET /list/:key` - Get all list items
- `POST /list/:key` - Add item to list

### User Operations
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `DELETE /users/:id` - Delete user

### Health Check
- `GET /health` - Basic Redis health check
- `GET /health/detailed` - Detailed health check for all connections

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `REDIS_USERNAME` | Redis username | `default` |
| `REDIS_KEY_PREFIX` | Prefix for all Redis keys | `example:` |
| `REDIS_TLS` | Enable TLS (set to 'false' to disable) | `true` |

## Testing with Swagger

Once the application is running, you can test all APIs interactively via Swagger UI:

1. Open http://localhost:3000/api in your browser
2. You'll see all endpoints organized by tags (cache, counter, list, users, health)
3. Click on any endpoint to expand it
4. Click "Try it out" button
5. Fill in the required parameters
6. Click "Execute" to test the endpoint
7. View the response below

### Example: Testing User Creation

1. Navigate to the **users** section in Swagger
2. Click on `POST /users` endpoint
3. Click "Try it out"
4. Modify the request body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```
5. Click "Execute"
6. You'll see the response with the created user including auto-generated ID

### Example: Testing Cache Operations

1. Navigate to **cache** section
2. Use `POST /cache/{key}` to store a value
3. Then use `GET /cache/{key}` to retrieve it
4. Finally use `DELETE /cache/{key}` to remove it

## Security Note

⚠️ **Never commit your `.env` file to version control!** 

The `.env` file contains sensitive credentials and is already added to `.gitignore`.
