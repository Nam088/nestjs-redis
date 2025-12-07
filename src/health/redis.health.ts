import { Injectable } from '@nestjs/common';

import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';

import { DEFAULT_REDIS_NAME } from '../constants/redis.constants';
import { RedisService } from '../services/redis.service';

/**
 * Default timeout for health checks in milliseconds
 */
const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Redis Health Indicator
 * Checks the health status of Redis connections
 */
@Injectable()
export class RedisHealthIndicator {
    constructor(
        private readonly redisService: RedisService,
        private readonly healthIndicatorService: HealthIndicatorService,
    ) {}

    /**
     * Check health of all Redis connections
     * @param key - The key to use in the health check result
     * @param timeoutMs - Timeout in milliseconds (default: 5000)
     * @returns Health indicator result
     */
    async checkAllConnections(
        key: string,
        timeoutMs = DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const clients = this.redisService.getClients();
            const connectionNames = Array.from(clients.keys());

            if (connectionNames.length === 0) {
                return indicator.down('No Redis connections found');
            }

            // Check all connections with timeout
            const results = await Promise.all(
                connectionNames.map(async (name) => {
                    try {
                        const client = clients.get(name);

                        if (!client) {
                            return {
                                name,
                                status: 'down',
                                error: 'Client not found',
                            };
                        }

                        await this.pingWithTimeout(client, timeoutMs);

                        return { name, status: 'up' };
                    } catch (error) {
                        return {
                            name,
                            status: 'down',
                            error: error instanceof Error ? error.message : 'Unknown error',
                        };
                    }
                }),
            );

            // Check if any connection is down
            const hasFailure = results.some((r) => r.status === 'down');

            if (hasFailure) {
                return indicator.down({
                    connections: results,
                    total: connectionNames.length,
                });
            }

            return indicator.up({
                connections: results,
                total: connectionNames.length,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            return indicator.down(errorMessage);
        }
    }

    /**
     * Check if Redis connection is healthy
     * @param key - The key to use in the health check result
     * @param connectionName - Optional connection name (defaults to 'default')
     * @param timeoutMs - Timeout in milliseconds (default: 5000)
     * @returns Health indicator result
     */
    async isHealthy(
        key: string,
        connectionName = DEFAULT_REDIS_NAME,
        timeoutMs = DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const client = this.redisService.getClient(connectionName);

            // Ping Redis to check connection with timeout
            await this.pingWithTimeout(client, timeoutMs);

            return indicator.up({
                status: 'up',
                connection: connectionName,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            return indicator.down(errorMessage);
        }
    }

    /**
     * Ping Redis client with timeout
     * @private
     * @param client - Redis client instance
     * @param timeoutMs - Timeout in milliseconds
     * @throws {Error} If ping times out or fails
     */
    private async pingWithTimeout(client: { ping: () => Promise<string> }, timeoutMs: number): Promise<void> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Health check timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        await Promise.race([client.ping(), timeoutPromise]);
    }
}
