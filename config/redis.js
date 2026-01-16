

const { Redis } = require("@upstash/redis");
const dotenv = require("dotenv");

dotenv.config();

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (!this.client) {
        this.client = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
      }

      // Test connection
      const res = await this.client.ping();
      if (res === "PONG") {
        this.isConnected = true;
        console.log("Upstash Redis connected successfully");
      }

      return this.client;
    } catch (error) {
      this.isConnected = false;
      console.error("Failed to connect to Upstash Redis:", error.message);
      throw error;
    }
  }

  async disconnect() {
    // REST Redis me actual socket close nahi hota
    this.client = null;
    this.isConnected = false;
    console.log("Upstash Redis client reset");
  }

  async ping() {
    try {
      if (!this.client) return false;
      const res = await this.client.ping();
      return res === "PONG";
    } catch (error) {
      console.error("Redis ping failed:", error.message);
      return false;
    }
  }

  getClient() {
    return this.client;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
    };
  }
}

// Singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;


// const { createClient } = require("redis");
// const dotenv = require('dotenv');
// dotenv.config();

// // Redis client with production-level configuration
// class RedisClient {
//   constructor() {
//     this.client = null;
//     this.isConnected = false;
//     this.retryAttempts = 0;
//     this.maxRetries = parseInt(process.env.REDIS_MAX_RETRIES) || 5;
//     this.retryDelay = parseInt(process.env.REDIS_RETRY_DELAY) || 1000;
//   }

//   async connect() {
//     try {
//       // Use environment variable or default to localhost
//       const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

//       this.client = createClient({
//         url: redisUrl,
//         socket: {
//           connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
//           commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 5000,
//           reconnectStrategy: (retries) => {
//             if (retries > this.maxRetries) {
//               console.error("Max Redis reconnection attempts reached");
//               return new Error("Max reconnection attempts reached");
//             }
//             this.retryAttempts = retries;
//             return Math.min(retries * this.retryDelay, 5000);
//           }
//         }
//       });

//       // Event handlers
//       this.client.on("error", (err) => {
//         console.error("Redis Error:", err.message);
//         this.isConnected = false;
//       });

//       this.client.on("connect", () => {
//         console.log("Redis client connecting...");
//         this.isConnected = false;
//       });

//       this.client.on("ready", () => {
//         console.log("Redis client ready");
//         this.isConnected = true;
//         this.retryAttempts = 0;
//       });

//       this.client.on("reconnecting", () => {
//         console.log(`Redis client reconnecting (attempt ${this.retryAttempts + 1})...`);
//       });

//       this.client.on("end", () => {
//         console.log("Redis connection closed");
//         this.isConnected = false;
//       });

//       await this.client.connect();
//       console.log("Connected to Redis successfully");
      
//       return this.client;
//     } catch (error) {
//       console.error("Failed to connect to Redis:", error.message);
//       throw error;
//     }
//   }

//   async disconnect() {
//     try {
//       if (this.client) {
//         await this.client.quit();
//         console.log("Redis connection closed gracefully");
//         this.isConnected = false;
//       }
//     } catch (error) {
//       console.error("Error disconnecting from Redis:", error.message);
//       throw error;
//     }
//   }

//   async ping() {
//     try {
//       if (!this.isConnected || !this.client) {
//         return false;
//       }
//       const result = await this.client.ping();
//       return result === "PONG";
//     } catch (error) {
//       console.error("Redis ping failed:", error.message);
//       return false;
//     }
//   }

//   getClient() {
//     return this.client;
//   }

//   getStatus() {
//     return {
//       isConnected: this.isConnected,
//       retryAttempts: this.retryAttempts
//     };
//   }
// }

// // Singleton instance
// const redisClient = new RedisClient();

// module.exports = redisClient;
