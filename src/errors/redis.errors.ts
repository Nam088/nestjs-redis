/**
 * Base class for Redis-related errors
 */
export class RedisError extends Error {
    constructor(
        message: string,
        public readonly cause?: Error,
    ) {
        super(message);
        this.name = this.constructor.name;

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Error thrown when a Redis client is not found
 */
export class RedisClientNotFoundError extends RedisError {
    constructor(public readonly clientName: string) {
        super(`Redis client with name "${clientName}" not found`);
    }
}

/**
 * Error thrown when Redis cluster validation fails
 */
export class RedisClusterConfigError extends RedisError {
    constructor(message: string) {
        super(message);
    }
}

/**
 * Error thrown when a Redis connection fails or is unavailable
 */
export class RedisConnectionError extends RedisError {
    constructor(
        public readonly clientName: string,
        cause?: Error,
    ) {
        super(`Redis connection "${clientName}" failed: ${cause?.message || 'Unknown error'}`, cause);
    }
}

/**
 * Error thrown when JSON serialization/deserialization fails
 */
export class RedisSerializationError extends RedisError {
    constructor(
        public readonly key: string,
        public readonly operation: 'parse' | 'stringify',
        cause?: Error,
    ) {
        super(`Failed to ${operation} JSON for key "${key}": ${cause?.message || 'Unknown error'}`, cause);
    }
}

/**
 * Error thrown when a Redis operation times out
 */
export class RedisTimeoutError extends RedisError {
    constructor(
        public readonly operation: string,
        public readonly timeoutMs: number,
    ) {
        super(`Redis operation "${operation}" timed out after ${timeoutMs}ms`);
    }
}
