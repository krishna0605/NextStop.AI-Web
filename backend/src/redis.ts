import type { ConnectionOptions } from "bullmq";

export function getRedisConnection({
  blocking = false,
}: {
  blocking?: boolean;
} = {}): ConnectionOptions {
  const configuredUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  const parsed = new URL(configuredUrl);
  const database = parsed.pathname && parsed.pathname !== "/" ? Number(parsed.pathname.slice(1)) : 0;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : parsed.protocol === "rediss:" ? 6380 : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number.isFinite(database) ? database : 0,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: blocking ? null : undefined,
  };
}
