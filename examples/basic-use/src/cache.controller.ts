import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { RedisService } from '@nam088/nestjs-redis';

/**
 * Cache Controller
 * Demonstrates basic Redis caching operations
 */
@ApiTags('cache')
@Controller('cache')
export class CacheController {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Set a cache value with TTL
   */
  @Post(':key')
  @ApiOperation({
    summary: 'Set cache value',
    description: 'Store any value in Redis cache with 1 hour TTL',
  })
  @ApiParam({ name: 'key', description: 'Cache key', example: 'user-session' })
  @ApiBody({
    description: 'Data to cache (any JSON value)',
    examples: {
      string: { value: { value: 'Hello World' } },
      object: { value: { name: 'John', age: 30 } },
      array: { value: { items: [1, 2, 3] } },
    },
  })
  @ApiResponse({ status: 200, description: 'Value cached successfully' })
  async set(
    @Param('key') key: string,
    @Body() data: any,
  ): Promise<{ success: boolean; key: string }> {
    await this.redisService.setWithTTL(key, data, 3600); // TTL: 1 hour
    return { success: true, key };
  }

  /**
   * Get a cached value
   */
  @Get(':key')
  @ApiOperation({
    summary: 'Get cache value',
    description: 'Retrieve a value from Redis cache',
  })
  @ApiParam({ name: 'key', description: 'Cache key', example: 'user-session' })
  @ApiResponse({
    status: 200,
    description: 'Returns cached value or null if not found',
  })
  async get(@Param('key') key: string): Promise<any> {
    return await this.redisService.getJSON(key);
  }

  /**
   * Delete a cache entry
   */
  @Delete(':key')
  @ApiOperation({
    summary: 'Delete cache value',
    description: 'Remove a value from Redis cache',
  })
  @ApiParam({ name: 'key', description: 'Cache key', example: 'user-session' })
  @ApiResponse({ status: 200, description: 'Value deleted successfully' })
  async delete(@Param('key') key: string): Promise<{ success: boolean }> {
    await this.redisService.delete(key);
    return { success: true };
  }
}
