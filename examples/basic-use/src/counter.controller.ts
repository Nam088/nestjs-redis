import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RedisService } from '@nam088/nestjs-redis';

/**
 * Counter Controller
 * Demonstrates Redis counter/increment operations
 */
@ApiTags('counter')
@Controller('counter')
export class CounterController {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Increment a counter
   */
  @Post(':key/increment')
  @ApiOperation({
    summary: 'Increment counter',
    description: 'Atomically increment a counter by 1',
  })
  @ApiParam({ name: 'key', description: 'Counter key', example: 'page-views' })
  @ApiResponse({
    status: 200,
    description: 'Returns new counter value',
    type: Number,
  })
  async increment(@Param('key') key: string): Promise<number> {
    return await this.redisService.increment(key);
  }

  /**
   * Get counter value
   */
  @Get(':key')
  @ApiOperation({
    summary: 'Get counter value',
    description: 'Retrieve current counter value',
  })
  @ApiParam({ name: 'key', description: 'Counter key', example: 'page-views' })
  @ApiResponse({
    status: 200,
    description: 'Returns counter key and value',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'page-views' },
        value: { type: 'number', example: 42 },
      },
    },
  })
  async get(
    @Param('key') key: string,
  ): Promise<{ key: string; value: number }> {
    const client = this.redisService.getClient();
    const value = await client.get(key);
    return {
      key,
      value: value ? parseInt(value, 10) : 0,
    };
  }
}
