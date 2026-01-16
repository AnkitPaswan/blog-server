const redisClient = require("../config/redis.js");
const dotenv = require('dotenv');
dotenv.config();

// Rate limit configurations
const RATE_LIMITS = {
  GENERAL: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per minute
  },
  AUTH: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 300000, // 5 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // 5 login attempts per 5 minutes
  },
  API: {
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.API_RATE_LIMIT_MAX) || 50,
  },
  STRICT: {
    windowMs: parseInt(process.env.STRICT_RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.STRICT_RATE_LIMIT_MAX) || 10,
  },
};

/**
 * Get client identifier (IP address)
 * @param {Request} req - Express request object
 * @returns {string} Client identifier
 */
const getClientId = (req) => {
  // Check for forwarded IP (behind proxy)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  // Check for real IP header
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return realIp;
  }
  
  // Fallback to socket address
  return req.socket?.remoteAddress || req.ip || "unknown";
};

/**
 * Create a rate limiter with Redis storage
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.keyPrefix - Redis key prefix
 * @param {Function} options.keyGenerator - Custom key generator
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const { 
    windowMs = RATE_LIMITS.GENERAL.windowMs, 
    max = RATE_LIMITS.GENERAL.max,
    keyPrefix = "ratelimit",
    keyGenerator = getClientId,
    message = "Too many requests, please try again later",
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    handler = null
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    try {
      const client = redisClient.getClient();
      
      // Check if Redis is connected
      if (!client || !redisClient.getStatus().isConnected) {
        console.warn("Redis not connected, rate limiting skipped");
        return next();
      }

      // Generate rate limit key
      const customKey = keyGenerator ? keyGenerator(req) : getClientId(req);
      const key = `${keyPrefix}:${customKey}:${Math.floor(Date.now() / windowMs)}`;

      // Get current request count
      const currentCount = await client.get(key);
      
      // Check if rate limit exceeded
      if (currentCount && parseInt(currentCount) >= max) {
        // Get remaining time
        const ttl = await client.ttl(key);
        
        // Set rate limit headers
        res.set("X-RateLimit-Limit", max.toString());
        res.set("X-RateLimit-Remaining", "0");
        res.set("X-RateLimit-Reset", (Math.floor(Date.now() / 1000) + ttl).toString());
        res.set("Retry-After", ttl.toString());

        // Custom handler or default response
        if (handler) {
          return handler(req, res, next);
        }

        return res.status(429).json({
          success: false,
          message,
          retryAfter: ttl,
          rateLimit: {
            limit: max,
            remaining: 0,
            reset: Math.floor(Date.now() / 1000) + ttl
          }
        });
      }

      // Increment request count
      const newCount = await client.incr(key);
      
      // Set expiration on first request
      if (newCount === 1) {
        await client.expire(key, windowSeconds);
      }

      // Calculate remaining requests
      const remaining = Math.max(0, max - newCount);
      const resetTime = Math.floor(Date.now() / 1000) + (await client.ttl(key));

      // Set rate limit headers
      res.set("X-RateLimit-Limit", max.toString());
      res.set("X-RateLimit-Remaining", remaining.toString());
      res.set("X-RateLimit-Reset", resetTime.toString());

      // Attach rate limit info to request
      req.rateLimit = {
        limit: max,
        remaining,
        reset: resetTime,
        current: newCount
      };

      next();
    } catch (error) {
      console.error("Rate limiting error:", error.message);
      // On error, allow request but log warning
      next();
    }
  };
};

/**
 * Rate limiter for authentication endpoints (login, register)
 */
const authRateLimiter = createRateLimiter({
  ...RATE_LIMITS.AUTH,
  keyPrefix: "ratelimit:auth",
  message: "Too many authentication attempts, please try again later",
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please wait 5 minutes before trying again.",
      retryAfter: 300
    });
  }
});

/**
 * Rate limiter for general API endpoints
 */
const apiRateLimiter = createRateLimiter({
  ...RATE_LIMITS.API,
  keyPrefix: "ratelimit:api"
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictRateLimiter = createRateLimiter({
  ...RATE_LIMITS.STRICT,
  keyPrefix: "ratelimit:strict",
  message: "Rate limit exceeded, please try again later"
});

/**
 * Create custom rate limiter for specific endpoints
 * @param {Object} config - Rate limit configuration
 * @returns {Function} Express middleware
 */
const customRateLimiter = (config) => {
  return createRateLimiter({
    windowMs: config.windowMs || RATE_LIMITS.GENERAL.windowMs,
    max: config.max || RATE_LIMITS.GENERAL.max,
    keyPrefix: config.keyPrefix || "ratelimit",
    keyGenerator: config.keyGenerator,
    message: config.message || "Too many requests, please try again later"
  });
};

/**
 * Skip rate limiting for certain conditions
 * @param {Function} condition - Condition function that returns true to skip
 * @returns {Function} Wrapped middleware
 */
const skipRateLimiter = (condition) => {
  return (req, res, next) => {
    if (condition(req)) {
      return next();
    }
    return apiRateLimiter(req, res, next);
  };
};

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  customRateLimiter,
  skipRateLimiter,
  RATE_LIMITS,
  getClientId
};
