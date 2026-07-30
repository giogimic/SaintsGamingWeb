/**
 * lib/crypto.ts
 * 
 * Provides End-to-End Encryption (E2EE) utilities using the native Web Crypto API.
 * 
 * - ECDH (P-256) for Key Generation and Exchange
 * - HKDF for symmetric key derivation
 * - AES-GCM (256-bit) for symmetric encryption
 */

// Wait, to keep things simple without adding dependencies, we can just export it as JWK or PKCS8 and store in localStorage, or use a tiny IndexedDB wrapper.
// Let's use localStorage with exported keys for MVP simplicity, as this avoids an async IndexedDB setup which complicates the React context.

// Wait, the standard way is:
// generateKey() -> CryptoKey
// exportKey("jwk") -> string
// store string in localStorage

const ALGO_KEY_EXCHANGE = { name: "ECDH", namedCurve: "P-256" };
const ALGO_ENCRYPTION = { name: "AES-GCM", length: 256 };

export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    ALGO_KEY_EXCHANGE,
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
  return keyPair;
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return Buffer.from(exported).toString("base64");
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return Buffer.from(exported).toString("base64");
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const binaryDer = Buffer.from(base64, "base64");
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    ALGO_KEY_EXCHANGE,
    true,
    []
  );
}

export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const binaryDer = Buffer.from(base64, "base64");
  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    ALGO_KEY_EXCHANGE,
    true,
    ["deriveKey", "deriveBits"]
  );
}

// Derive a shared AES-GCM key from our private key and their public key
export async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    ALGO_ENCRYPTION,
    false, // we don't need to export the shared AES key
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(sharedKey: CryptoKey, text: string): Promise<{ ciphertext: string, iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedKey,
    data
  );

  return {
    ciphertext: Buffer.from(encrypted).toString("base64"),
    iv: Buffer.from(iv).toString("base64")
  };
}

export async function decryptMessage(sharedKey: CryptoKey, ciphertextBase64: string, ivBase64: string): Promise<string> {
  const encrypted = Buffer.from(ciphertextBase64, "base64");
  const iv = Buffer.from(ivBase64, "base64");

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedKey,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Storage helpers
const STORAGE_KEY = "sg_e2ee_private_key";

export function getLocalPrivateKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setLocalPrivateKey(pkcs8Base64: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, pkcs8Base64);
  }
}
