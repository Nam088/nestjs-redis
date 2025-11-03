import { Injectable } from '@nestjs/common';
import { RedisService } from '@nam088/nestjs-redis';
import { User } from './user.controller';

/**
 * User Service
 * Demonstrates using Redis as a data store
 */
@Injectable()
export class UserService {
  private readonly USER_KEY_PREFIX = 'user:';
  private readonly USERS_SET_KEY = 'users:all';

  constructor(private readonly redisService: RedisService) {}

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const id = Date.now().toString();
    const user: User = { id, ...userData };

    // Store user data
    await this.redisService.setJSON(`${this.USER_KEY_PREFIX}${id}`, user);

    // Add to users set for indexing
    await this.redisService.setAdd(this.USERS_SET_KEY, id);

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.redisService.getJSON<User>(
      `${this.USER_KEY_PREFIX}${id}`,
    );
  }

  async getAllUsers(): Promise<User[]> {
    const userIds = await this.redisService.setMembers(this.USERS_SET_KEY);
    const users: User[] = [];

    for (const id of userIds) {
      const user = await this.getUserById(id);
      if (user) {
        users.push(user);
      }
    }

    return users;
  }

  async deleteUser(id: string): Promise<void> {
    await this.redisService.delete(`${this.USER_KEY_PREFIX}${id}`);
    await this.redisService.setRemove(this.USERS_SET_KEY, id);
  }
}
