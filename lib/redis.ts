import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  const url =
    String(
      process.env.UPSTASH_REDIS_REST_URL ??
        "",
    ).trim();

  const token =
    String(
      process.env.UPSTASH_REDIS_REST_TOKEN ??
        "",
    ).trim();

  if (!url || !token) {
    return null;
  }

  if (
    /^\[.*\]$/.test(url) ||
    /^\[.*\]$/.test(token)
  ) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  }
  catch {
    return null;
  }

  if (parsedUrl.protocol !== "https:") {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
    });
  }

  return redisClient;
}
