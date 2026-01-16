const redisClient = require("../config/redis.js");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || "24h";

const BLACKLIST_PREFIX = "blacklist:token:";
const SESSION_PREFIX = "session:user:";
const SESSION_TTL = parseInt(process.env.SESSION_TTL || "86400");

class SessionService {
  get client() {
    if (!redisClient.getStatus().isConnected) return null;
    return redisClient.getClient();
  }

  async createSession(userId, sessionData) {
    try {
      if (!this.client) return false;

      const key = `${SESSION_PREFIX}${userId}`;

      await this.client.set(
        key,
        JSON.stringify({
          ...sessionData,
          createdAt: new Date().toISOString(),
        }),
        { ex: SESSION_TTL }
      );

      console.log(`Session created for user: ${userId}`);
      return true;
    } catch (err) {
      console.error("Session creation error:", err.message);
      return false;
    }
  }

  async getSession(userId) {
    try {
      if (!this.client) return null;

      const data = await this.client.get(`${SESSION_PREFIX}${userId}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Session retrieval error:", err.message);
      return null;
    }
  }

  async updateSession(userId, sessionData) {
    try {
      if (!this.client) return false;

      const existing = await this.getSession(userId);
      if (!existing) return false;

      await this.client.set(
        `${SESSION_PREFIX}${userId}`,
        JSON.stringify({
          ...existing,
          ...sessionData,
          updatedAt: new Date().toISOString(),
        }),
        { ex: SESSION_TTL }
      );

      return true;
    } catch (err) {
      console.error("Session update error:", err.message);
      return false;
    }
  }

  async deleteSession(userId) {
    try {
      if (!this.client) return false;
      await this.client.del(`${SESSION_PREFIX}${userId}`);
      return true;
    } catch (err) {
      console.error("Session deletion error:", err.message);
      return false;
    }
  }

  async blacklistToken(token) {
    try {
      if (!this.client) return false;

      let ttl;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl <= 0) return true;
      } catch {
        return true;
      }

      await this.client.set(
        `${BLACKLIST_PREFIX}${token}`,
        "true",
        { ex: ttl }
      );

      return true;
    } catch (err) {
      console.error("Token blacklist error:", err.message);
      return false;
    }
  }

  async isBlacklisted(token) {
    try {
      if (!this.client) return false;
      return Boolean(
        await this.client.exists(`${BLACKLIST_PREFIX}${token}`)
      );
    } catch (err) {
      console.error("Blacklist check error:", err.message);
      return false;
    }
  }

  async unblacklistToken(token) {
    try {
      if (!this.client) return false;
      await this.client.del(`${BLACKLIST_PREFIX}${token}`);
      return true;
    } catch (err) {
      console.error("Unblacklist error:", err.message);
      return false;
    }
  }

  async extendSession(userId, ttl = SESSION_TTL) {
    try {
      if (!this.client) return false;
      await this.client.expire(`${SESSION_PREFIX}${userId}`, ttl);
      return true;
    } catch (err) {
      console.error("Extend session error:", err.message);
      return false;
    }
  }

  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}

module.exports = new SessionService();


// const redisClient = require("../config/redis.js");
// const jwt = require("jsonwebtoken");

// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// const TOKEN_EXPIRY = process.env.JWT_EXPIRY || '24h';
// const BLACKLIST_PREFIX = "blacklist:token:";
// const SESSION_PREFIX = "session:user:";
// const SESSION_TTL = parseInt(process.env.SESSION_TTL) || 86400; // 24 hours

// class SessionService {
//   /**
//    * Store a session in Redis
//    * @param {string} userId - User ID
//    * @param {Object} sessionData - Session data to store
//    * @returns {Promise<boolean>} Success status
//    */
//   async createSession(userId, sessionData) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         console.warn("Redis not connected, session creation skipped");
//         return false;
//       }

//       const key = `${SESSION_PREFIX}${userId}`;
//       await client.setEx(key, SESSION_TTL, JSON.stringify(sessionData));
      
//       console.log(`Session created for user: ${userId}`);
//       return true;
//     } catch (error) {
//       console.error("Session creation error:", error.message);
//       return false;
//     }
//   }

//   /**
//    * Get session from Redis
//    * @param {string} userId - User ID
//    * @returns {Promise<Object|null>} Session data or null
//    */
//   async getSession(userId) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return null;
//       }

//       const key = `${SESSION_PREFIX}${userId}`;
//       const session = await client.get(key);
      
//       if (session) {
//         return JSON.parse(session);
//       }
      
//       return null;
//     } catch (error) {
//       console.error("Session retrieval error:", error.message);
//       return null;
//     }
//   }

//   /**
//    * Update session data
//    * @param {string} userId - User ID
//    * @param {Object} sessionData - Updated session data
//    * @returns {Promise<boolean>} Success status
//    */
//   async updateSession(userId, sessionData) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return false;
//       }

//       const key = `${SESSION_PREFIX}${userId}`;
//       const existingSession = await this.getSession(userId);
      
//       if (!existingSession) {
//         return false;
//       }

//       const updatedData = { ...existingSession, ...sessionData, updatedAt: new Date().toISOString() };
//       await client.setEx(key, SESSION_TTL, JSON.stringify(updatedData));
      
//       return true;
//     } catch (error) {
//       console.error("Session update error:", error.message);
//       return false;
//     }
//   }

//   /**
//    * Delete session
//    * @param {string} userId - User ID
//    * @returns {Promise<boolean>} Success status
//    */
//   async deleteSession(userId) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return false;
//       }

//       const key = `${SESSION_PREFIX}${userId}`;
//       await client.del(key);
      
//       console.log(`Session deleted for user: ${userId}`);
//       return true;
//     } catch (error) {
//       console.error("Session deletion error:", error.message);
//       return false;
//     }
//   }

//   /**
//    * Add token to blacklist (for logout)
//    * @param {string} token - JWT token
//    * @param {number} expiresIn - Expiry time in seconds
//    * @returns {Promise<boolean>} Success status
//    */
//   async blacklistToken(token, expiresIn = null) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         console.warn("Redis not connected, token blacklisting skipped");
//         return false;
//       }

//       // Decode token to get expiration
//       let ttl = expiresIn;
//       if (!ttl) {
//         try {
//           const decoded = jwt.verify(token, JWT_SECRET);
//           ttl = decoded.exp - Math.floor(Date.now() / 1000);
//         } catch (err) {
//           // Token already expired or invalid
//           return true;
//         }
//       }

//       const key = `${BLACKLIST_PREFIX}${token}`;
//       await client.setEx(key, ttl, "true");
      
//       console.log(`Token blacklisted`);
//       return true;
//     } catch (error) {
//       console.error("Token blacklisting error:", error.message);
//       return false;
//     }
//   }

//   /**
//    * Check if token is blacklisted
//    * @param {string} token - JWT token
//    * @returns {Promise<boolean>} Blacklist status
//    */
//   async isBlacklisted(token) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return false;
//       }

//       const key = `${BLACKLIST_PREFIX}${token}`;
//       const result = await client.exists(key);
      
//       return result === 1;
//     } catch (error) {
//       console.error("Blacklist check error:", error.message);
//       return false;
//     }
//   }

//   /**
//    * Remove token from blacklist
//    * @param {string} token - JWT token
//    * @returns {Promise<boolean>} Success status
//    */
//   async unblacklistToken(token) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return false;
//       }

//       const key = `${BLACKLIST_PREFIX}${token}`;
//       await client.del(key);
      
//       console.log(`Token removed from blacklist`);
//       return true;
//     } catch (error) {
//       console.error("Token unblacklisting error:", error.message);
//       return false;
//     }
//   }

//   /**
//    * Get active session count for a user
//    * @param {string} userId - User ID
//    * @returns {Promise<number>} Session count
//    */
//   async getActiveSessionCount(userId) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return 0;
//       }

//       const key = `${SESSION_PREFIX}${userId}`;
//       const exists = await client.exists(key);
      
//       return exists === 1 ? 1 : 0;
//     } catch (error) {
//       console.error("Session count error:", error.message);
//       return 0;
//     }
//   }

//   /**
//    * Extend session TTL
//    * @param {string} userId - User ID
//    * @param {number} ttl - New TTL in seconds
//    * @returns {Promise<boolean>} Success status
//    */
//   async extendSession(userId, ttl = SESSION_TTL) {
//     try {
//       const client = redisClient.getClient();
//       if (!client || !redisClient.getStatus().isConnected) {
//         return false;
//       }

//       const key = `${SESSION_PREFIX}${userId}`;
//       await client.expire(key, ttl);
      
//       return true;
//     } catch (error) {
//       console.error("Session extension error:", error.message);
//       return false;
//     }
//   }

//   /**
//    * Generate JWT token
//    * @param {Object} payload - Token payload
//    * @returns {string} JWT token
//    */
//   generateToken(payload) {
//     return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
//   }

//   /**
//    * Verify JWT token
//    * @param {string} token - JWT token
//    * @returns {Object|null} Decoded token or null
//    */
//   verifyToken(token) {
//     try {
//       return jwt.verify(token, JWT_SECRET);
//     } catch (error) {
//       return null;
//     }
//   }

//   /**
//    * Get token expiration time
//    * @param {string} token - JWT token
//    * @returns {number|null} Expiration timestamp or null
//    */
//   getTokenExpiration(token) {
//     try {
//       const decoded = jwt.decode(token);
//       return decoded?.exp || null;
//     } catch (error) {
//       return null;
//     }
//   }
// }

// // Export session service instance
// const sessionService = new SessionService();

// module.exports = { sessionService, SESSION_PREFIX, BLACKLIST_PREFIX, SESSION_TTL };
