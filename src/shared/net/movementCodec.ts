/**
 * Compact binary codecs for high-frequency MMO movement deltas.
 * Shared client/server — no socket.io imports.
 *
 * Layout (player_moved / creature_moved):
 *  [0]      uint8  magic (1=player, 2=creature)
 *  [1]      uint8  version (1)
 *  [2..3]   uint16 x
 *  [4..5]   uint16 y
 *  [6]      uint8  direction enum
 *  [7]      uint8  flags (bit0=isMoving)
 *  [8..9]   uint16 hp
 *  [10..11] uint16 maxHp
 *  [12]     uint8  idLen
 *  […]      utf8   socketId (player) or entityId (creature)
 *  [..]     uint8  nameLen + utf8 name (player only)
 *  [..]     uint8  spriteLen + utf8 spriteId (player only)
 *  [..]     uint8  entityLen + utf8 entityId (player only)
 *  [..]     uint8  ownerLen + utf8 ownerId (creature only)
 *  [..]     uint8  behaviorLen + utf8 behavior (creature only)
 */

export const MOVE_CODEC_VERSION = 1;
export const MOVE_MAGIC_PLAYER = 1;
export const MOVE_MAGIC_CREATURE = 2;

const DIR_TO_CODE: Record<string, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

const CODE_TO_DIR = ["down", "left", "right", "up"] as const;

export type DecodedPlayerMoved = {
  socketId: string;
  entityId: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
  hp: number;
  maxHp: number;
  name: string;
  spriteId: string;
};

export type DecodedCreatureMoved = {
  entityId: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
  hp: number;
  maxHp: number;
  ownerId: string;
  behavior: string;
};

function writeString(view: DataView, offset: number, value: string, bytes: Uint8Array): number {
  const len = Math.min(255, bytes.length);
  view.setUint8(offset, len);
  offset += 1;
  for (let i = 0; i < len; i++) {
    view.setUint8(offset + i, bytes[i]!);
  }
  return offset + len;
}

function readString(view: DataView, offset: number, decoder: TextDecoder): { value: string; offset: number } {
  const len = view.getUint8(offset);
  offset += 1;
  const slice = new Uint8Array(view.buffer, view.byteOffset + offset, len);
  return { value: decoder.decode(slice), offset: offset + len };
}

function encodeHeader(
  magic: number,
  x: number,
  y: number,
  direction: string,
  isMoving: boolean,
  hp: number,
  maxHp: number
): { buffer: ArrayBuffer; view: DataView; offset: number } {
  // Reserve a generous buffer; trim via Uint8Array slice at end
  const buffer = new ArrayBuffer(512);
  const view = new DataView(buffer);
  view.setUint8(0, magic);
  view.setUint8(1, MOVE_CODEC_VERSION);
  view.setUint16(2, Math.max(0, Math.min(65535, Math.round(x))), false);
  view.setUint16(4, Math.max(0, Math.min(65535, Math.round(y))), false);
  view.setUint8(6, DIR_TO_CODE[direction] ?? 0);
  view.setUint8(7, isMoving ? 1 : 0);
  view.setUint16(8, Math.max(0, Math.min(65535, Math.round(hp))), false);
  view.setUint16(10, Math.max(0, Math.min(65535, Math.round(maxHp))), false);
  return { buffer, view, offset: 12 };
}

export function encodePlayerMoved(delta: DecodedPlayerMoved): ArrayBuffer {
  const enc = new TextEncoder();
  const { buffer, view, offset: start } = encodeHeader(
    MOVE_MAGIC_PLAYER,
    delta.x,
    delta.y,
    delta.direction,
    delta.isMoving,
    delta.hp,
    delta.maxHp
  );
  let offset = start;
  offset = writeString(view, offset, delta.socketId, enc.encode(delta.socketId));
  offset = writeString(view, offset, delta.name, enc.encode(delta.name));
  offset = writeString(view, offset, delta.spriteId, enc.encode(delta.spriteId));
  offset = writeString(view, offset, delta.entityId, enc.encode(delta.entityId));
  return buffer.slice(0, offset);
}

export function encodeCreatureMoved(delta: DecodedCreatureMoved): ArrayBuffer {
  const enc = new TextEncoder();
  const { buffer, view, offset: start } = encodeHeader(
    MOVE_MAGIC_CREATURE,
    delta.x,
    delta.y,
    delta.direction,
    delta.isMoving,
    delta.hp,
    delta.maxHp
  );
  let offset = start;
  offset = writeString(view, offset, delta.entityId, enc.encode(delta.entityId));
  offset = writeString(view, offset, delta.ownerId ?? "", enc.encode(delta.ownerId ?? ""));
  offset = writeString(view, offset, delta.behavior ?? "", enc.encode(delta.behavior ?? ""));
  return buffer.slice(0, offset);
}

export function isBinaryMovementPayload(data: unknown): data is ArrayBuffer | ArrayBufferView {
  return (
    (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) ||
    (typeof Buffer !== "undefined" && typeof Buffer.isBuffer === "function" && Buffer.isBuffer(data)) ||
    ArrayBuffer.isView(data)
  );
}

function toDataView(data: ArrayBuffer | ArrayBufferView): DataView {
  if (data instanceof ArrayBuffer) return new DataView(data);
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

export function decodePlayerMoved(data: ArrayBuffer | ArrayBufferView): DecodedPlayerMoved | null {
  try {
    const view = toDataView(data);
    if (view.byteLength < 13) return null;
    if (view.getUint8(0) !== MOVE_MAGIC_PLAYER) return null;
    if (view.getUint8(1) !== MOVE_CODEC_VERSION) return null;
    const decoder = new TextDecoder();
    const x = view.getUint16(2, false);
    const y = view.getUint16(4, false);
    const direction = CODE_TO_DIR[view.getUint8(6)] ?? "down";
    const isMoving = (view.getUint8(7) & 1) === 1;
    const hp = view.getUint16(8, false);
    const maxHp = view.getUint16(10, false);
    let offset = 12;
    const socketId = readString(view, offset, decoder);
    offset = socketId.offset;
    const name = readString(view, offset, decoder);
    offset = name.offset;
    const spriteId = readString(view, offset, decoder);
    offset = spriteId.offset;
    const entityId = readString(view, offset, decoder);
    return {
      socketId: socketId.value,
      entityId: entityId.value,
      x,
      y,
      direction,
      isMoving,
      hp,
      maxHp,
      name: name.value,
      spriteId: spriteId.value,
    };
  } catch {
    return null;
  }
}

export function decodeCreatureMoved(data: ArrayBuffer | ArrayBufferView): DecodedCreatureMoved | null {
  try {
    const view = toDataView(data);
    if (view.byteLength < 13) return null;
    if (view.getUint8(0) !== MOVE_MAGIC_CREATURE) return null;
    if (view.getUint8(1) !== MOVE_CODEC_VERSION) return null;
    const decoder = new TextDecoder();
    const x = view.getUint16(2, false);
    const y = view.getUint16(4, false);
    const direction = CODE_TO_DIR[view.getUint8(6)] ?? "down";
    const isMoving = (view.getUint8(7) & 1) === 1;
    const hp = view.getUint16(8, false);
    const maxHp = view.getUint16(10, false);
    let offset = 12;
    const entityId = readString(view, offset, decoder);
    offset = entityId.offset;
    const ownerId = readString(view, offset, decoder);
    offset = ownerId.offset;
    const behavior = readString(view, offset, decoder);
    return {
      entityId: entityId.value,
      x,
      y,
      direction,
      isMoving,
      hp,
      maxHp,
      ownerId: ownerId.value,
      behavior: behavior.value,
    };
  } catch {
    return null;
  }
}

/** Normalize socket.io binary payloads (Buffer / ArrayBuffer / typed array). */
export function normalizeBinaryPayload(data: unknown): ArrayBuffer | ArrayBufferView | null {
  if (!isBinaryMovementPayload(data)) return null;
  return data;
}
