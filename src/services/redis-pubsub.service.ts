import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import Redis, { Cluster } from 'ioredis';

/**
 * Configuration options for Pub/Sub service
 */
export interface PubSubOptions {
    /**
     * Number of milliseconds to wait for message handler timeout
     * @default 30000
     */
    messageTimeoutMs?: number;
}

/**
 * Dedicated Redis Pub/Sub Service
 *
 * This service manages dedicated subscriber clients to avoid blocking
 * the main Redis connection. Redis requires separate connections for
 * pub/sub operations as a client in subscriber mode cannot execute
 * other commands.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class NotificationService {
 *   constructor(private readonly pubSubService: RedisPubSubService) {}
 *
 *   async onModuleInit() {
 *     this.unsubscribe = await this.pubSubService.subscribe(
 *       'notifications',
 *       (channel, message) => {
 *         console.log(`Received: ${message}`);
 *       }
 *     );
 *   }
 *
 *   async onModuleDestroy() {
 *     await this.unsubscribe();
 *   }
 * }
 * ```
 */
@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
    private readonly cleanupFunctions: Array<() => Promise<void>> = [];
    private readonly logger = new Logger(RedisPubSubService.name);
    private readonly publisherClients = new Map<string, Cluster | Redis>();
    private readonly subscriberClients = new Map<string, Cluster | Redis>();

    constructor(private readonly mainClients: Map<string, Cluster | Redis>) {}

    /**
     * Clean up all subscriber connections when module is destroyed
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.log('Closing all Pub/Sub connections...');

        // Execute all cleanup functions
        await Promise.all(this.cleanupFunctions.map((fn) => fn().catch(() => {})));

        // Close subscriber clients
        const closePromises = Array.from(this.subscriberClients.values()).map((client) =>
            client.quit().catch((err: Error) => {
                this.logger.error(`Error closing subscriber connection: ${err.message}`);
            }),
        );

        await Promise.all(closePromises);
        this.subscriberClients.clear();
        this.logger.log('All Pub/Sub connections closed');
    }

    /**
     * Get or create a publisher client (uses main client)
     * @private
     */
    private getPublisherClient(clientName: string): Cluster | Redis {
        const client = this.mainClients.get(clientName);

        if (!client) {
            throw new Error(`Redis client "${clientName}" not found`);
        }

        return client;
    }

    /**
     * Get or create a dedicated subscriber client
     *
     * @param {string} [clientName='default'] - Name of the main Redis connection to duplicate
     * @returns {Redis | Cluster} Dedicated subscriber client
     * @throws {Error} If main client is not found
     */
    getSubscriberClient(clientName: string = 'default'): Cluster | Redis {
        if (this.subscriberClients.has(clientName)) {
            return this.subscriberClients.get(clientName);
        }

        const mainClient = this.mainClients.get(clientName);

        if (!mainClient) {
            throw new Error(`Main Redis client "${clientName}" not found`);
        }

        // Duplicate the connection for subscriptions
        const subscriberClient = mainClient.duplicate();

        subscriberClient.on('error', (err: Error) => {
            this.logger.error(`Subscriber client "${clientName}" error:`, err.stack);
        });

        subscriberClient.on('connect', () => {
            this.logger.log(`Subscriber client "${clientName}" connected`);
        });

        this.subscriberClients.set(clientName, subscriberClient);

        return subscriberClient;
    }

    /**
     * Get the number of active subscriptions across all subscriber clients
     *
     * @returns {number} Number of active subscriber clients
     */
    getSubscriptionCount(): number {
        let count = 0;

        for (const client of this.subscriberClients.values()) {
            // ioredis tracks subscription count internally
            const { status } = client as Redis;

            if (status === 'ready') {
                count++;
            }
        }

        return count;
    }

    /**
     * Publish a message to a channel
     *
     * @param {string} channel - Channel name
     * @param {string | object} message - Message to publish (will be stringified if not a string)
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<number>} Number of clients that received the message
     */
    async publish(channel: string, message: object | string, clientName: string = 'default'): Promise<number> {
        const client = this.getPublisherClient(clientName);
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

        return client.publish(channel, messageStr);
    }

    /**
     * Subscribe to Redis channels matching a pattern using a dedicated client
     *
     * @param {string | string[]} patterns - Pattern(s) to subscribe to (e.g., 'user:*')
     * @param {(pattern: string, channel: string, message: string) => void} callback - Callback for messages
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<() => Promise<void>>} Cleanup function to unsubscribe
     *
     * @example
     * ```typescript
     * const unsubscribe = await pubSubService.psubscribe(
     *   'events:*',
     *   (pattern, channel, message) => {
     *     console.log(`Pattern ${pattern} matched ${channel}: ${message}`);
     *   }
     * );
     * ```
     */
    async psubscribe(
        patterns: string | string[],
        callback: (pattern: string, channel: string, message: string) => void,
        clientName: string = 'default',
    ): Promise<() => Promise<void>> {
        const client = this.getSubscriberClient(clientName);
        const patternArray = Array.isArray(patterns) ? patterns : [patterns];

        await client.psubscribe(...patternArray);

        const pmessageHandler = (pattern: string, channel: string, message: string): void => {
            try {
                callback(pattern, channel, message);
            } catch (error) {
                this.logger.error(`Error in pattern message handler for "${pattern}":`, error);
            }
        };

        client.on('pmessage', pmessageHandler);
        this.logger.log(`Pattern subscribed to: ${patternArray.join(', ')}`);

        const cleanup = async (): Promise<void> => {
            client.off('pmessage', pmessageHandler);
            await client.punsubscribe(...patternArray);
            this.logger.log(`Pattern unsubscribed from: ${patternArray.join(', ')}`);
        };

        this.cleanupFunctions.push(cleanup);

        return cleanup;
    }

    /**
     * Subscribe to Redis channel(s) using a dedicated subscriber client
     *
     * Unlike the main RedisService.subscribe(), this method uses a dedicated
     * connection that won't block other Redis operations.
     *
     * @param {string | string[]} channels - Channel(s) to subscribe to
     * @param {(channel: string, message: string) => void} callback - Callback function for messages
     * @param {string} [clientName='default'] - Name of the Redis connection to use
     * @returns {Promise<() => Promise<void>>} Cleanup function to unsubscribe
     *
     * @example
     * ```typescript
     * const unsubscribe = await pubSubService.subscribe(
     *   ['orders', 'payments'],
     *   (channel, message) => {
     *     console.log(`${channel}: ${message}`);
     *   }
     * );
     *
     * // Later:
     * await unsubscribe();
     * ```
     */
    async subscribe(
        channels: string | string[],
        callback: (channel: string, message: string) => void,
        clientName: string = 'default',
    ): Promise<() => Promise<void>> {
        const client = this.getSubscriberClient(clientName);
        const channelArray = Array.isArray(channels) ? channels : [channels];

        await client.subscribe(...channelArray);

        const messageHandler = (channel: string, message: string): void => {
            if (channelArray.includes(channel)) {
                try {
                    callback(channel, message);
                } catch (error) {
                    this.logger.error(`Error in message handler for channel "${channel}":`, error);
                }
            }
        };

        client.on('message', messageHandler);
        this.logger.log(`Subscribed to channel(s): ${channelArray.join(', ')}`);

        const cleanup = async (): Promise<void> => {
            client.off('message', messageHandler);
            await client.unsubscribe(...channelArray);
            this.logger.log(`Unsubscribed from channel(s): ${channelArray.join(', ')}`);
        };

        this.cleanupFunctions.push(cleanup);

        return cleanup;
    }
}
