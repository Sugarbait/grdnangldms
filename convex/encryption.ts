import CryptoJS from "crypto-js";

/**
 * Derive an encryption key from a password using PBKDF2
 * This ensures the same password always produces the same key
 */
export function deriveEncryptionKey(password: string, salt: string = "guardian-angel-dms"): string {
  // Use PBKDF2 to derive a key from the password
  // 1000 iterations for reasonable security/performance balance
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32, // 256 bits = 8 words (32-bit words)
    iterations: 1000
  });
  return key.toString();
}

/**
 * Generate a random encryption key for a new user
 */
export function generateEncryptionKey(): string {
  // Generate a random 256-bit key (64 hex characters)
  return CryptoJS.lib.WordArray.random(32).toString();
}

/**
 * Encrypt data using the user's master encryption key
 */
export function encryptData(data: string, encryptionKey: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, encryptionKey).toString();
    return encrypted;
  } catch (error) {
    console.error("[ENCRYPTION] Failed to encrypt data:", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypt data using the user's master encryption key
 */
export function decryptData(encryptedData: string, encryptionKey: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey).toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error("Decryption resulted in empty data");
    }
    return decrypted;
  } catch (error) {
    console.error("[ENCRYPTION] Failed to decrypt data:", error);
    throw new Error("Decryption failed - invalid key or corrupted data");
  }
}

/**
 * Encrypt binary data (for files) - returns base64 encoded encrypted data
 */
export function encryptBinaryData(data: ArrayBuffer, encryptionKey: string): string {
  try {
    // Convert ArrayBuffer to WordArray
    const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(data));
    const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
    return encrypted;
  } catch (error) {
    console.error("[ENCRYPTION] Failed to encrypt binary data:", error);
    throw new Error("Binary encryption failed");
  }
}

/**
 * Decrypt binary data - takes base64 encrypted data and returns ArrayBuffer
 */
export function decryptBinaryData(encryptedData: string, encryptionKey: string): ArrayBuffer {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);

    // Convert WordArray to Uint8Array then to ArrayBuffer
    const uintArray = new Uint8Array(
      decrypted.words.flatMap((word: number) => [
        (word >> 24) & 0xff,
        (word >> 16) & 0xff,
        (word >> 8) & 0xff,
        word & 0xff
      ])
    );

    return uintArray.buffer;
  } catch (error) {
    console.error("[ENCRYPTION] Failed to decrypt binary data:", error);
    throw new Error("Binary decryption failed");
  }
}
