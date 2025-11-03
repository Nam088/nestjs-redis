import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { RedisService } from '@nam088/nestjs-redis';

/**
 * List Controller
 * Demonstrates Redis list operations
 */
@ApiTags('list')
@Controller('list')
export class ListController {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Add item to list (push to right)
   */
  @Post(':key')
  @ApiOperation({
    summary: 'Add item to list',
    description: 'Push an item to the right of a Redis list (RPUSH)',
  })
  @ApiParam({ name: 'key', description: 'List key', example: 'tasks' })
  @ApiBody({
    description: 'Item to add to the list',
    schema: {
      type: 'object',
      properties: {
        value: { type: 'string', example: 'Buy groceries' },
      },
      required: ['value'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Item added successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        length: { type: 'number', example: 5 },
      },
    },
  })
  async add(
    @Param('key') key: string,
    @Body() data: { value: string },
  ): Promise<{ success: boolean; length: number }> {
    const length = await this.redisService.listPushRight(key, data.value);
    return { success: true, length };
  }

  /**
   * Get all items from list
   */
  @Get(':key')
  @ApiOperation({
    summary: 'Get all list items',
    description: 'Retrieve all items from a Redis list (LRANGE 0 -1)',
  })
  @ApiParam({ name: 'key', description: 'List key', example: 'tasks' })
  @ApiResponse({
    status: 200,
    description: 'Returns array of list items',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['Buy groceries', 'Walk the dog', 'Finish project'],
    },
  })
  async getAll(@Param('key') key: string): Promise<string[]> {
    return await this.redisService.listRange(key, 0, -1);
  }
}
