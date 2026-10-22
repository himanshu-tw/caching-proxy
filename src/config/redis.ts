import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URl || "redis://localhost:6379";

const redisClient = createClient({ url: redisUrl });

redisClient.on("error", (err) => console.error("Redis client error: ", err));
redisClient.on("connect", () => console.log("Redis client connecting..."));
redisClient.on("ready", () => console.log("Redis client is connected and ready"));

export const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    } catch (err) {
        console.error("Failed to connect to redis: ", err)
        process.exit(1);
    }
}

export default redisClient;
