import Redis from "ioredis";

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

  // Encrypt data (simple and bulletproof)
  encrypt(text: any): string {
    if (text === null || text === undefined) return "";

    const dataToEncrypt =
      typeof text === "object" ? JSON.stringify(text) : String(text);

    // Simple XOR encryption with key
    const key = this.key;
    let encrypted = "";

    for (let i = 0; i < dataToEncrypt.length; i++) {
      const char = dataToEncrypt.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(char ^ keyChar);
    }

    // Base64 encode the result
    return Buffer.from(encrypted, "binary").toString("base64");
  }

  // Decrypt data (simple and bulletproof)
  decrypt(encryptedData: string | null): any {
    if (!encryptedData) return null;
    if (typeof encryptedData !== "string") return encryptedData;

    // Handle empty string case (represents null/undefined)
    if (encryptedData === "") return null;

    try {
      // Base64 decode
      const encrypted = Buffer.from(encryptedData, "base64").toString("binary");

      // Simple XOR decryption with key
      const key = this.key;
      let decrypted = "";

      for (let i = 0; i < encrypted.length; i++) {
        const char = encrypted.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(char ^ keyChar);
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      // If anything fails, return original data
      return encryptedData;
    }
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

  async rpop(key: string): Promise<any> {
    const result = await this.redis.rpop(key);
    return this.decrypt(result);
  }

  async llen(key: string): Promise<number> {
    return await this.redis.llen(key);
  }

  // === SET OPERATIONS ===
  async sadd(key: string, ...members: any[]): Promise<number> {
    const encrypted = members.map((m) => this.encrypt(m));
    return await this.redis.sadd(key, ...encrypted);
  }

  async smembers(key: string): Promise<any[]> {
    const results = await this.redis.smembers(key);
    return results.map((item: any) => this.decrypt(item));
  }

  async sismember(key: string, member: any): Promise<number> {
    return await this.redis.sismember(key, this.encrypt(member));
  }

  async srem(key: string, ...members: any[]): Promise<number> {
    const encrypted = members.map((m) => this.encrypt(m));
    return await this.redis.srem(key, ...encrypted);
  }

  // === HASH OPERATIONS ===
  async hset(key: string, ...args: any[]): Promise<number>;
  async hset(key: string, obj: Record<string, any>): Promise<number>;
  async hset(key: string, ...args: any[]): Promise<number> {
    if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      // Object format: hset(key, {field: value})
      const encrypted: Record<string, string> = {};
      for (const [field, value] of Object.entries(args[0])) {
        encrypted[field] = this.encrypt(value);
      }
      return await this.redis.hset(key, encrypted);
    } else {
      // Field-value pairs: hset(key, field1, value1, field2, value2)
      const encrypted: any[] = [];
      for (let i = 0; i < args.length; i += 2) {
        encrypted.push(args[i]); // field
        encrypted.push(this.encrypt(args[i + 1])); // value
      }
      return await this.redis.hset(key, ...encrypted);
    }
  }

  async hget(key: string, field: string): Promise<any> {
    const result = await this.redis.hget(key, field);
    return this.decrypt(result);
  }

  async hgetall(key: string): Promise<Record<string, any> | null> {
    const result = await this.redis.hgetall(key);
    if (!result) return result;

    const decrypted: Record<string, any> = {};
    for (const [field, value] of Object.entries(result)) {
      decrypted[field] = this.decrypt(value as any);
    }
    return decrypted;
  }

  async hmget(key: string, ...fields: string[]): Promise<any[]> {
    const results = await this.redis.hmget(key, ...fields);
    return results.map((item: any) => this.decrypt(item));
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
