/**
 * Saints Gaming — Authoritative Chat Service
 *
 * Handles channel validation, sanitization, rate limiting, and whispering.
 */

import type { ChatBroadcastPayload } from "../../shared/net/protocol";

export class ChatService {
  /** Map of socketId -> array of recent message timestamps (for rate limiting) */
  private messageTimestamps = new Map<string, number[]>();
  private readonly MAX_MESSAGES_PER_WINDOW = 5;
  private readonly WINDOW_MS = 3000;
  private readonly MAX_CHAR_LENGTH = 500;

  public validateAndFormatMessage(
    socketId: string,
    sender: string,
    rawText: unknown,
    channel: "LOCAL" | "GLOBAL" | "PARTY" | "WHISPER" | "SYSTEM",
    recipient?: string
  ): { ok: boolean; payload?: ChatBroadcastPayload; error?: string } {
    if (typeof rawText !== "string") {
      return { ok: false, error: "Invalid message payload" };
    }

    const text = rawText.trim();
    if (!text) {
      return { ok: false, error: "Message is empty" };
    }

    if (text.length > this.MAX_CHAR_LENGTH) {
      return { ok: false, error: `Message exceeds maximum length of ${this.MAX_CHAR_LENGTH}` };
    }

    // Rate limit check
    const now = Date.now();
    let timestamps = this.messageTimestamps.get(socketId) || [];
    timestamps = timestamps.filter((t) => now - t < this.WINDOW_MS);

    if (timestamps.length >= this.MAX_MESSAGES_PER_WINDOW) {
      return { ok: false, error: "Rate limit exceeded. Please wait a moment." };
    }

    timestamps.push(now);
    this.messageTimestamps.set(socketId, timestamps);

    return {
      ok: true,
      payload: {
        socketId,
        sender: sender || "Player",
        message: text,
        channel,
        timestamp: now,
        recipient,
      },
    };
  }

  public cleanSocket(socketId: string) {
    this.messageTimestamps.delete(socketId);
  }
}
