import { createClient } from "redis";

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1", // force ipv4
    port: process.env.REDIS_PORT || 6379,
    reconnectStrategy: (retries) => {
      console.log(`🔄 Redis reconnection attempt ${retries}`);
      if (retries > 5) {
        console.log("❌ Max reconnection attempts reached - Redis may be down");
        return false;
      }
      return Math.min(retries * 1000, 5000);
    },
  },
});

redisClient.on("error", (err) =>
  console.log("❌ Redis Client Error:", err.message)
);
redisClient.on("connect", () => console.log("✅ Redis Connected"));
redisClient.on("ready", () => console.log("🚀 Redis Ready"));
redisClient.on("reconnecting", () => console.log("🔄 Redis Reconnecting"));

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

export default redisClient;