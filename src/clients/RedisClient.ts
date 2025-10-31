import Redis from "ioredis";
import type { ChainableCommander } from "ioredis";

export class RedisClient {
  private redis: Redis;
  private key: string;

  constructor(connectionString: string) {
    this.redis = new Redis(connectionString);
    this.key = process.env.REDIS_ENCRYPTION_KEY as string;

    if (!this.key || this.key.length !== 64) {
      throw new Error(
        "REDIS_ENCRYPTION_KEY must be 64 characters (32 bytes hex)"
      );
    }
  }

  // Encrypt data (Unicode-safe)
  encrypt(text: any): string {
    if (text === null || text === undefined) return "";

    const dataToEncrypt =
      typeof text === "object" ? JSON.stringify(text) : String(text);

    // Convert to UTF-8 bytes first
    const utf8Bytes = Buffer.from(dataToEncrypt, "utf8");
    const key = Buffer.from(this.key, "utf8");

    // XOR encryption
    const encrypted = Buffer.alloc(utf8Bytes.length);
    for (let i = 0; i < utf8Bytes.length; i++) {
      encrypted[i] = utf8Bytes[i] ^ key[i % key.length];
    }

    // Base64 encode the result
    return encrypted.toString("base64");
  }

  // Decrypt data (Unicode-safe)
  decrypt(encryptedData: string | null): any {
    if (!encryptedData) return null;
    if (typeof encryptedData !== "string") return encryptedData;
    if (encryptedData === "") return null;

    try {
      // Base64 decode
      const encrypted = Buffer.from(encryptedData, "base64");
      const key = Buffer.from(this.key, "utf8");

      // XOR decryption
      const decrypted = Buffer.alloc(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ key[i % key.length];
      }

      // Convert back to UTF-8 string
      const decryptedString = decrypted.toString("utf8");

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    } catch (error) {
      return encryptedData;
    }
  }

  // Pipeline support, Need to manually encrypt/decrypt within the pipeline when using
  pipeline(): ChainableCommander {
    return this.redis.pipeline();
  }

  // === STRING OPERATIONS ===
  async set(key: string, value: any): Promise<"OK"> {
    return await this.redis.set(key, this.encrypt(value));
  }

  async get(key: string): Promise<any> {
    const result = await this.redis.get(key);
    return this.decrypt(result);
  }

  async setex(key: string, seconds: number, value: any): Promise<"OK"> {
    return await this.redis.setex(key, seconds, this.encrypt(value));
  }

  async mset(obj: Record<string, any>): Promise<"OK"> {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      encrypted[key] = this.encrypt(value);
    }
    return await this.redis.mset(encrypted);
  }

  async mget(keys: string[]): Promise<any[]> {
    const results = await this.redis.mget(keys);
    return results.map((item: any) => this.decrypt(item));
  }

  // === LIST OPERATIONS ===
  async lpush(key: string, ...values: any[]): Promise<number> {
    const encrypted = values.map((v) => this.encrypt(v));
    return await this.redis.lpush(key, ...encrypted);
  }

  async lset(key: string, index: number, value: any): Promise<"OK"> {
    return await this.redis.lset(key, index, this.encrypt(value));
  }

  async rpush(key: string, ...values: any[]): Promise<number> {
    const encrypted = values.map((v) => this.encrypt(v));
    return await this.redis.rpush(key, ...encrypted);
  }

  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    const results = await this.redis.lrange(key, start, stop);
    return results.map((item: any) => this.decrypt(item));
  }

  async lpop(key: string): Promise<any> {
    const result = await this.redis.lpop(key);
    return this.decrypt(result);
  }

  async lrem(key: string, count: number, value: any): Promise<number> {
    return await this.redis.lrem(key, count, this.encrypt(value));
  }

  async rpop(key: string): Promise<any> {
    const result = await this.redis.rpop(key);
    return this.decrypt(result);
  }

  async llen(key: string): Promise<number> {
    return await this.redis.llen(key);
  }

  // === UTILITY METHODS ===
  async expire(key: string, seconds: number): Promise<number> {
    return await this.redis.expire(key, seconds);
  }

  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.redis.exists(key);
  }

  disconnect(): void {
    this.redis.disconnect();
  }

  // Direct access to raw Redis if needed
  get raw(): Redis {
    return this.redis;
  }
}
