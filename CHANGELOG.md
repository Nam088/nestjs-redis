# [1.1.0](https://github.com/nam088/nestjs-redis/compare/v1.0.1...v1.1.0) (2025-12-07)


### Bug Fixes

* reorder module properties in RedisCoreModule for consistency ([72e5e91](https://github.com/nam088/nestjs-redis/commit/72e5e91ecf830aaca57efbfdec675b3eb4780ca1))


### Features

* add basic-use example with Swagger documentation ([d310dd4](https://github.com/nam088/nestjs-redis/commit/d310dd4e6030ba31fd3b0519d8efa6d5e474a572))
* implement automated release workflow with semantic-release and add contributing guidelines ([29cf4e2](https://github.com/nam088/nestjs-redis/commit/29cf4e205d41e14f1cefca6df26859f2a7e7fa26))
* implement withClient context support and standardize constants ([f7548b8](https://github.com/nam088/nestjs-redis/commit/f7548b89a587a8675f78993db4c5d6a932105ff2))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-02

### Added
- Initial release
- Support for synchronous and asynchronous configuration
- Support for multiple Redis connections
- Support for Redis Cluster mode
- Automatic connection lifecycle management
- Utility methods for common Redis operations:
  - `setWithTTL()` - Set value with TTL
  - `getJSON()` - Get and parse JSON automatically
  - `setJSON()` - Set JSON value
  - `delete()` - Delete one or multiple keys
  - `exists()` - Check if key exists
  - `getTTL()` - Get TTL of a key
  - `increment()` - Increment numeric value
  - `decrement()` - Decrement numeric value
  - `flushDB()` - Flush database
  - `keys()` - Get keys matching pattern
- `@InjectRedis()` decorator for easy dependency injection
- Full TypeScript support with comprehensive type definitions
- Comprehensive JSDoc documentation
- Example usage in README
