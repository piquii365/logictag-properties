import { createCipheriv, createDecipheriv } from 'crypto';

/**
 * Mirrors PesePay's own client libraries (their JS/Ruby/Java/Dart SDKs all do
 * the same thing): AES-CBC/PKCS7, where both the key and the IV come
 * directly from the encryption key string — the key as its raw UTF-8 bytes,
 * the IV as the UTF-8 bytes of its first 16 characters — rather than a KDF
 * or a random per-message nonce. Output/input is base64.
 */
export class PesepaySecurity {
  private readonly algorithm: string;
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(encryptionKey: string) {
    this.key = Buffer.from(encryptionKey, 'utf8');
    this.iv = Buffer.from(encryptionKey.slice(0, 16), 'utf8');
    const bits = this.key.length * 8;
    if (![128, 192, 256].includes(bits)) {
      throw new Error(
        `PESEPAY_ENCRYPTION_KEY must be 16, 24, or 32 characters long (got ${this.key.length})`,
      );
    }
    this.algorithm = `aes-${bits}-cbc`;
  }

  encrypt(data: unknown): string {
    const cipher = createCipheriv(this.algorithm, this.key, this.iv);
    return Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final(),
    ]).toString('base64');
  }

  decrypt<T = unknown>(payload: string): T {
    const decipher = createDecipheriv(this.algorithm, this.key, this.iv);
    const json = Buffer.concat([
      decipher.update(Buffer.from(payload, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(json) as T;
  }
}
