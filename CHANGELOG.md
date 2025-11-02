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

