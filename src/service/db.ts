import redisClient from "../config/redis";

const CACHE_PREFIX = "proxy_cache:";

export const getCacheKey = (url: string): string => `${CACHE_PREFIX}${url}`;

export const getCachedResponse = async (url: string) => {
  try {
    const raw = await redisClient.get(getCacheKey(url));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read from cache:", err);
    return null;
  }
};

export const setCachedResponse = async (url: string, response: unknown, ttlSeconds = 60) => {
  try {
    const serialized = JSON.stringify(response);
    await redisClient.set(getCacheKey(url), serialized, { EX: ttlSeconds });
    return serialized;
  } catch (err) {
    console.error("Failed to write to cache:", err);
    return null;
  }
};

export const deleteCachedResponse = async (url: string) => {
  try {
    await redisClient.del(getCacheKey(url));
    return true;
  } catch (err) {
    console.error("Failed to delete from cache:", err);
    return false;
  }
};

export const clearAllCache = async () => {
  try {
    const keys = await redisClient.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return keys.length;
  } catch (err) {
    console.error("Failed to clear cache:", err);
    return 0;
  }
};
