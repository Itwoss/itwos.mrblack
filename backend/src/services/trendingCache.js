/**
 * Trending Cache Service
 * Uses Redis for fast trending list access with in-memory fallback
 */

let redisClient = null;
let useRedis = false;
const inMemoryCache = new Map(); // Fallback cache

// Try to initialize Redis (optional dependency)
try {
  const redis = require('redis');
  
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    const redisConfig = {
      url: process.env.REDIS_URL,
      socket: process.env.REDIS_HOST ? {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379
      } : undefined
    };
    
    redisClient = redis.createClient(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
      useRedis = false;
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      useRedis = true;
    });
    
    redisClient.connect().catch(err => {
      console.warn('⚠️ Redis connection failed, using in-memory cache:', err.message);
      useRedis = false;
    });
  } else {
    console.log('ℹ️ Redis not configured, using in-memory cache');
    useRedis = false;
  }
} catch (error) {
  console.warn('⚠️ Redis package not installed, using in-memory cache. Install with: npm install redis');
  useRedis = false;
}

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = 300; // 5 minutes (matches cron job frequency)

/**
 * Get trending posts from cache
 * @param {string} key - Cache key (e.g., 'trending:global', 'trending:hashtag:travel')
 * @returns {Promise<Array|null>} - Cached trending posts or null if not found
 */
async function getTrendingFromCache(key) {
  try {
    if (useRedis && redisClient) {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } else {
      // In-memory fallback
      const cached = inMemoryCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      } else {
        inMemoryCache.delete(key);
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null;
  }
}

/**
 * Set trending posts in cache
 * @param {string} key - Cache key
 * @param {Array} posts - Trending posts to cache
 * @param {number} ttl - Time to live in seconds (default: CACHE_TTL)
 */
async function setTrendingInCache(key, posts, ttl = CACHE_TTL) {
  try {
    if (useRedis && redisClient) {
      await redisClient.setEx(key, ttl, JSON.stringify(posts));
    } else {
      // In-memory fallback
      inMemoryCache.set(key, {
        data: posts,
        expiresAt: Date.now() + (ttl * 1000)
      });
      
      // Clean up expired entries periodically
      if (inMemoryCache.size > 100) {
        cleanupInMemoryCache();
      }
    }
  } catch (error) {
    console.error('Error setting cache:', error);
  }
}

/**
 * Add a post to trending sorted set (Redis ZADD pattern)
 * @param {string} key - Sorted set key (e.g., 'trending:global')
 * @param {string} postId - Post ID
 * @param {number} score - Trending score
 */
async function addToTrendingSet(key, postId, score) {
  try {
    if (useRedis && redisClient) {
      await redisClient.zAdd(key, {
        score: score,
        value: postId.toString()
      });
      // Set TTL on the sorted set
      await redisClient.expire(key, CACHE_TTL);
    } else {
      // In-memory fallback: store in array and sort
      const setKey = `${key}:set`;
      let set = inMemoryCache.get(setKey) || [];
      set = set.filter(item => item.postId !== postId);
      set.push({ postId, score });
      set.sort((a, b) => b.score - a.score);
      inMemoryCache.set(setKey, {
        data: set,
        expiresAt: Date.now() + (CACHE_TTL * 1000)
      });
    }
  } catch (error) {
    console.error('Error adding to trending set:', error);
  }
}

/**
 * Get top N posts from trending sorted set
 * @param {string} key - Sorted set key
 * @param {number} limit - Number of posts to retrieve
 * @returns {Promise<Array>} - Array of post IDs sorted by score
 */
async function getTopTrendingFromSet(key, limit = 50) {
  try {
    if (useRedis && redisClient) {
      const result = await redisClient.zRange(key, 0, limit - 1, {
        REV: true // Reverse order (highest score first)
      });
      return result;
    } else {
      // In-memory fallback
      const setKey = `${key}:set`;
      const cached = inMemoryCache.get(setKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data.slice(0, limit).map(item => item.postId);
      }
    }
    return [];
  } catch (error) {
    console.error('Error getting top trending from set:', error);
    return [];
  }
}

/**
 * Clear trending cache
 * @param {string} key - Cache key (optional, clears all if not provided)
 */
async function clearTrendingCache(key = null) {
  try {
    if (useRedis && redisClient) {
      if (key) {
        await redisClient.del(key);
        await redisClient.del(`${key}:set`);
      } else {
        // Clear all trending keys
        const keys = await redisClient.keys('trending:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }
    } else {
      // In-memory fallback
      if (key) {
        inMemoryCache.delete(key);
        inMemoryCache.delete(`${key}:set`);
      } else {
        const keysToDelete = [];
        for (const k of inMemoryCache.keys()) {
          if (k.startsWith('trending:')) {
            keysToDelete.push(k);
          }
        }
        keysToDelete.forEach(k => inMemoryCache.delete(k));
      }
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clean up expired entries from in-memory cache
 */
function cleanupInMemoryCache() {
  const now = Date.now();
  for (const [key, value] of inMemoryCache.entries()) {
    if (value.expiresAt && value.expiresAt < now) {
      inMemoryCache.delete(key);
    }
  }
}

/**
 * Initialize cache service
 */
async function initializeCache() {
  if (useRedis && redisClient) {
    try {
      await redisClient.ping();
      console.log('✅ Trending cache service initialized with Redis');
    } catch (error) {
      console.warn('⚠️ Redis ping failed, using in-memory cache');
      useRedis = false;
    }
  } else {
    console.log('ℹ️ Trending cache service initialized with in-memory cache');
  }
  
  // Clean up expired entries every 5 minutes
  setInterval(cleanupInMemoryCache, 5 * 60 * 1000);
}

// Initialize on module load
if (redisClient && useRedis) {
  initializeCache().catch(err => {
    console.error('Error initializing cache:', err);
  });
} else {
  initializeCache();
}

module.exports = {
  getTrendingFromCache,
  setTrendingInCache,
  addToTrendingSet,
  getTopTrendingFromSet,
  clearTrendingCache,
  initializeCache,
  useRedis
};

