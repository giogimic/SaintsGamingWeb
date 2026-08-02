import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptMessage,
  deriveSharedKey,
  encryptMessage,
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  getLocalPrivateKey,
  importPrivateKey,
  importPublicKey,
  setLocalPrivateKey,
} from "./crypto";

describe("messenger crypto (E2EE helpers)", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    // Node has Web Crypto; crypto.ts still addresses window.crypto / localStorage.
    (globalThis as unknown as { window: typeof globalThis }).window = globalThis as unknown as Window &
      typeof globalThis;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    // leave window as-is for subsequent crypto tests in this file
  });

  it("round-trips ECDH encrypt/decrypt between two parties", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const alicePub = await exportPublicKey(alice.publicKey);
    const bobPub = await exportPublicKey(bob.publicKey);
    const alicePriv = await exportPrivateKey(alice.privateKey);

    const aliceImportedPriv = await importPrivateKey(alicePriv);
    const bobImportedPub = await importPublicKey(bobPub);
    const aliceImportedPub = await importPublicKey(alicePub);

    const aliceShared = await deriveSharedKey(aliceImportedPriv, bobImportedPub);
    const bobShared = await deriveSharedKey(bob.privateKey, aliceImportedPub);

    const { ciphertext, iv } = await encryptMessage(aliceShared, "secret lobby ping");
    const plain = await decryptMessage(bobShared, ciphertext, iv);
    expect(plain).toBe("secret lobby ping");
  });

  it("stores and reads local private key via localStorage", () => {
    expect(getLocalPrivateKey()).toBeNull();
    setLocalPrivateKey("pkcs8-demo");
    expect(getLocalPrivateKey()).toBe("pkcs8-demo");
  });
});
