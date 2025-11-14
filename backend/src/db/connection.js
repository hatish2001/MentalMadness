const { Pool } = require('pg');
const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// PostgreSQL connection pool
const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Set encryption key for PostgreSQL session
pgPool.on('connect', async (client) => {
  await client.query(`SET app.encryption_key = $1`, [process.env.ENCRYPTION_KEY]);
});

// Test PostgreSQL connection
pgPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  } else {
    console.log('PostgreSQL connected successfully at:', res.rows[0].now);
  }
});

// Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
  password: process.env.REDIS_PASSWORD || undefined,
  legacyMode: false
});

// Redis error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully');
  } catch (err) {
    console.error('Redis connection error:', err);
    // Don't exit process for Redis - it's not critical for MVP
  }
})();

// Helper function to execute queries with automatic audit logging
async function query(text, params, userId = null) {
  const start = Date.now();
  try {
    const res = await pgPool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 1000) {
      global.logger.warn({
        message: 'Slow query detected',
        query: text,
        duration,
        rows: res.rowCount
      });
    }
    
    return res;
  } catch (error) {
    global.logger.error({
      message: 'Database query error',
      query: text,
      error: error.message,
      userId
    });
    throw error;
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Cache helper functions
const cache = {
  async get(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      global.logger.error('Redis get error:', error);
      return null;
    }
  },

  async set(key, value, expirationInSeconds = 3600) {
    try {
      await redisClient.setEx(
        key,
        expirationInSeconds,
        JSON.stringify(value)
      );
      return true;
    } catch (error) {
      global.logger.error('Redis set error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      global.logger.error('Redis delete error:', error);
      return false;
    }
  },

  async invalidatePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      global.logger.error('Redis invalidate pattern error:', error);
      return false;
    }
  }
};

module.exports = {
  pgPool,
  redisClient,
  query,
  transaction,
  cache
};
