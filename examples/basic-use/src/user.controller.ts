import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { UserService } from './user.service';

export class User {
  @ApiProperty({
    description: 'User ID (auto-generated)',
    example: 'user_abc123',
  })
  id: string;

  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'User email', example: 'john@example.com' })
  email: string;

  @ApiProperty({ description: 'User age', example: 30 })
  age: number;
}

export class CreateUserDto {
  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'User email', example: 'john@example.com' })
  email: string;

  @ApiProperty({ description: 'User age', example: 30 })
  age: number;
}

/**
 * User Controller
 * Demonstrates CRUD operations with Redis
 */
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({
    summary: 'Create user',
    description: 'Create a new user and store in Redis with auto-generated ID',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User created successfully',
    type: User,
  })
  async create(@Body() userData: CreateUserDto): Promise<User> {
    return await this.userService.createUser(userData);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve all users from Redis',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of users',
    type: [User],
  })
  async findAll(): Promise<User[]> {
    return await this.userService.getAllUsers();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user_abc123' })
  @ApiResponse({
    status: 200,
    description: 'Returns user or null if not found',
    type: User,
  })
  async findOne(@Param('id') id: string): Promise<User | null> {
    return await this.userService.getUserById(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete a user from Redis',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user_abc123' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.userService.deleteUser(id);
    return { success: true };
  }
}
