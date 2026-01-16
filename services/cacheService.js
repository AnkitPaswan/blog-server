

const redisClient = require("../config/redis.js");

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
  SHORT: parseInt(process.env.CACHE_TTL_SHORT) || 60,
  MEDIUM: parseInt(process.env.CACHE_TTL_MEDIUM) || 300,
  LONG: parseInt(process.env.CACHE_TTL_LONG) || 3600,
  VERY_LONG: parseInt(process.env.CACHE_TTL_VERY_LONG) || 86400,
};

// Cache key prefixes
const CACHE_KEYS = {
  POSTS: "posts",
  POST: "post",
  CATEGORIES: "categories",
  COMMENTS: "comments",
  PROFILE: "profile",
  SEARCH: "search",
  STATS: "stats",
};

class CacheService {
  /* ===================== GET ===================== */
  async get(key) {
    try {
      const client = redisClient.getClient();
      if (!client) {
        console.warn("Redis not initialized, cache miss");
        return null;
      }

      const value = await client.get(key);
      if (!value) {
        console.log(`Cache miss: ${key}`);
        return null;
      }

      try {
        const parsed = JSON.parse(value);
        console.log(`Cache hit: ${key}`);
        return parsed;
      } catch {
        console.warn(`Corrupted cache for key ${key}, deleting`);
        await client.del(key);
        return null;
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  /* ===================== SET ===================== */
  async set(key, value, ttl = CACHE_TTL.MEDIUM) {
    try {
      const client = redisClient.getClient();
      if (!client) {
        console.warn("Redis not initialized, cache set skipped");
        return false;
      }

      await client.set(
        key,
        JSON.stringify(value),
        { ex: ttl }
      );

      console.log(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  /* ===================== DELETE ===================== */
  async delete(key) {
    try {
      const client = redisClient.getClient();
      if (!client) return false;

      await client.del(key);
      console.log(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  }

  /* ===================== DELETE PATTERN ===================== */
  async deletePattern(pattern) {
    try {
      const client = redisClient.getClient();
      if (!client) return 0;

      const keys = await client.keys(pattern);
      if (keys.length) {
        await client.del(keys);
        console.log(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
      }
      return keys.length;
    } catch (error) {
      console.error(`Cache pattern delete error for ${pattern}:`, error.message);
      return 0;
    }
  }

  async clearPrefix(prefix) {
    return this.deletePattern(`${prefix}:*`);
  }

  /* ===================== GET OR SET ===================== */
  async getOrSet(key, fetchFn, ttl = CACHE_TTL.MEDIUM) {
    try {
      const cached = await this.get(key);
      if (cached !== null) return cached;

      const data = await fetchFn();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error.message);
      return await fetchFn();
    }
  }

  /* ===================== INVALIDATE ===================== */
  async invalidate(type, identifier = null) {
    try {
      if (identifier) {
        await this.delete(`${type}:${identifier}`);
      } else {
        await this.clearPrefix(type);
      }
      console.log(
        `Cache invalidated: ${type}${identifier ? `:${identifier}` : ""}`
      );
    } catch (error) {
      console.error("Cache invalidation error:", error.message);
    }
  }

  /* ===================== EXISTS ===================== */
  async exists(key) {
    try {
      const client = redisClient.getClient();
      if (!client) return false;

      return (await client.exists(key)) === 1;
    } catch (error) {
      console.error(`Cache exists error for ${key}:`, error.message);
      return false;
    }
  }

  /* ===================== TTL ===================== */
  async getTTL(key) {
    try {
      const client = redisClient.getClient();
      if (!client) return -2;

      return await client.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for ${key}:`, error.message);
      return -2;
    }
  }

  /* ===================== COUNTERS ===================== */
  async increment(key, increment = 1) {
    try {
      const client = redisClient.getClient();
      if (!client) return null;

      return await client.incrBy(key, increment);
    } catch (error) {
      console.error(`Cache increment error for ${key}:`, error.message);
      return null;
    }
  }

  async decrement(key, decrement = 1) {
    try {
      const client = redisClient.getClient();
      if (!client) return null;

      return await client.decrBy(key, decrement);
    } catch (error) {
      console.error(`Cache decrement error for ${key}:`, error.message);
      return null;
    }
  }
}

// Singleton
const cacheService = new CacheService();

module.exports = { cacheService, CACHE_TTL, CACHE_KEYS };


// const redisClient = require("../config/redis.js");

// // Cache TTL configurations (in seconds)
// const CACHE_TTL = {
//   SHORT: parseInt(process.env.CACHE_TTL_SHORT) || 60, // 1 minute
//   MEDIUM: parseInt(process.env.CACHE_TTL_MEDIUM) || 300, // 5 minutes
//   LONG: parseInt(process.env.CACHE_TTL_LONG) || 3600, // 1 hour
//   VERY_LONG: parseInt(process.env.CACHE_TTL_VERY_LONG) || 86400, // 24 hours
// };

// // Cache key prefixes
// const CACHE_KEYS = {
//   POSTS: "posts",
//   POST: "post",
//   CATEGORIES: "categories",
//   COMMENTS: "comments",
//   PROFILE: "profile",
//   SEARCH: "search",
//   STATS: "stats",
// };

// class CacheService {
//   /**
//    * Get a value from cache
//    * @param {string} key - Cache key
//    * @returns {Promise<any>} Cached value or null
//    */
//   async get(key) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         console.warn("Redis not connected, cache miss");
//         return null;
//       }

//       const value = await client.get(key);
//       if (value) {
//         console.log(`Cache hit: ${key}`);
//         return JSON.parse(value);
//       }

//       console.log(`Cache miss: ${key}`);
//       return null;
//     } catch (error) {
//       console.error(`Cache get error for key ${key}:`, error.message);
//       return null;
//     }
//   }

//   /**
//    * Set a value in cache with TTL
//    * @param {string} key - Cache key
//    * @param {any} value - Value to cache
//    * @param {number} ttl - Time to live in seconds (optional, uses default)
//    * @returns {Promise<boolean>} Success status
//    */
//   async set(key, value, ttl = CACHE_TTL.MEDIUM) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         console.warn("Redis not connected, cache set skipped");
//         return false;
//       }

//       // await client.setEx(key, ttl, JSON.stringify(value));
//       await client.set(key, JSON.stringify(value), { ex: ttl });
//       console.log(`Cache set: ${key} (TTL: ${ttl}s)`);
//       return true;
//     } catch (error) {
//       console.error(`Cache set error for key ${key}:`, error.message);
//       return false;
//     }
//   }

//   /**
//    * Delete a specific key from cache
//    * @param {string} key - Cache key to delete
//    * @returns {Promise<boolean>} Success status
//    */
//   async delete(key) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return false;
//       }

//       await client.del(key);
//       console.log(`Cache deleted: ${key}`);
//       return true;
//     } catch (error) {
//       console.error(`Cache delete error for key ${key}:`, error.message);
//       return false;
//     }
//   }

//   /**
//    * Delete multiple keys by pattern
//    * @param {string} pattern - Pattern to match (e.g., "posts:*")
//    * @returns {Promise<number>} Number of deleted keys
//    */
//   async deletePattern(pattern) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return 0;
//       }

//       const keys = await client.keys(pattern);
//       if (keys.length > 0) {
//         await client.del(keys);
//         console.log(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
//       }
//       return keys.length;
//     } catch (error) {
//       console.error(
//         `Cache pattern delete error for pattern ${pattern}:`,
//         error.message
//       );
//       return 0;
//     }
//   }

//   /**
//    * Clear all cache entries with a specific prefix
//    * @param {string} prefix - Cache key prefix
//    * @returns {Promise<number>} Number of deleted keys
//    */
//   async clearPrefix(prefix) {
//     return this.deletePattern(`${prefix}:*`);
//   }

//   /**
//    * Get or set cache pattern - fetch from cache or set value if not present
//    * @param {string} key - Cache key
//    * @param {Function} fetchFn - Function to fetch data if cache miss
//    * @param {number} ttl - TTL in seconds
//    * @returns {Promise<any>} Cached or fetched value
//    */
//   async getOrSet(key, fetchFn, ttl = CACHE_TTL.MEDIUM) {
//     try {
//       // Try to get from cache first
//       const cached = await this.get(key);
//       if (cached !== null) {
//         return cached;
//       }

//       // Cache miss, fetch data
//       const data = await fetchFn();

//       // Store in cache
//       await this.set(key, data, ttl);

//       return data;
//     } catch (error) {
//       console.error(`Cache getOrSet error for key ${key}:`, error.message);

//       // If cache fails, try to return fresh data
//       try {
//         return await fetchFn();
//       } catch (fetchError) {
//         throw fetchError;
//       }
//     }
//   }

//   /**
//    * Invalidate cache when data is updated
//    * @param {string} type - Cache type (posts, categories, etc.)
//    * @param {string|object} identifier - ID or query parameters
//    */
//   async invalidate(type, identifier = null) {
//     try {
//       if (identifier) {
//         await this.delete(`${type}:${identifier}`);
//       } else {
//         await this.clearPrefix(type);
//       }
//       console.log(
//         `Cache invalidated: ${type}${identifier ? `:${identifier}` : ""}`
//       );
//     } catch (error) {
//       console.error(`Cache invalidation error:`, error.message);
//     }
//   }

//   /**
//    * Check if cache exists
//    * @param {string} key - Cache key
//    * @returns {Promise<boolean>} Existence status
//    */
//   async exists(key) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return false;
//       }

//       const result = await client.exists(key);
//       return result === 1;
//     } catch (error) {
//       console.error(`Cache exists check error for key ${key}:`, error.message);
//       return false;
//     }
//   }

//   /**
//    * Get remaining TTL for a key
//    * @param {string} key - Cache key
//    * @returns {Promise<number>} TTL in seconds, -1 if no TTL, -2 if key doesn't exist
//    */
//   async getTTL(key) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return -2;
//       }

//       return await client.ttl(key);
//     } catch (error) {
//       console.error(`Cache TTL check error for key ${key}:`, error.message);
//       return -2;
//     }
//   }

//   /**
//    * Increment a counter in cache
//    * @param {string} key - Cache key
//    * @param {number} increment - Increment value (default: 1)
//    * @returns {Promise<number>} New value
//    */
//   async increment(key, increment = 1) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return null;
//       }

//       return await client.incrBy(key, increment);
//     } catch (error) {
//       console.error(`Cache increment error for key ${key}:`, error.message);
//       return null;
//     }
//   }

//   /**
//    * Decrement a counter in cache
//    * @param {string} key - Cache key
//    * @param {number} decrement - Decrement value (default: 1)
//    * @returns {Promise<number>} New value
//    */
//   async decrement(key, decrement = 1) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return null;
//       }

//       return await client.decrBy(key, decrement);
//     } catch (error) {
//       console.error(`Cache decrement error for key ${key}:`, error.message);
//       return null;
//     }
//   }
// }

// // Export cache service instance and constants
// const cacheService = new CacheService();

// module.exports = { cacheService, CACHE_TTL, CACHE_KEYS };
