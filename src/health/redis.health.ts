import { Injectable } from '@nestjs/common';

import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';

import { RedisService } from '../services/redis.service';

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
     * @returns Health indicator result
     */
    async checkAllConnections(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const clients = this.redisService.getClients();
            const connectionNames = Array.from(clients.keys());

            if (connectionNames.length === 0) {
                return indicator.down('No Redis connections found');
            }

            // Check all connections
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

                        await client.ping();

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
     * @returns Health indicator result
     */
    async isHealthy(key: string, connectionName = 'default'): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const client = this.redisService.getClient(connectionName);

            if (!client) {
                return indicator.down(`Redis client "${connectionName}" not found`);
            }

            // Ping Redis to check connection
            await client.ping();

            return indicator.up({
                status: 'up',
                connection: connectionName,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            return indicator.down(errorMessage);
        }
    }
}
