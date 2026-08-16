/**
 * Saints Gaming — Sanctuary Estate Grid & Furniture Placement Engine (Bible 13)
 * Manages player-owned Sanctuary estate room plots, construction tiers, and furniture placement collisions.
 */

export type RoomType =
  | 'GARDEN'
  | 'PARLOUR'
  | 'KITCHEN'
  | 'WORKSHOP'
  | 'PORTAL_CHAMBER'
  | 'ALTAR_ROOM'
  | 'THRONE_ROOM';

export interface PlacedFurniture {
  id: string;
  name: string;
  x: number; // 0 to 7 relative to room
  y: number; // 0 to 7 relative to room
  width: number;
  height: number;
  hotspotType: string;
  reqConstructionLevel: number;
}

export interface EstateRoom {
  roomX: number; // 0 to 4 (5x5 estate grid)
  roomY: number; // 0 to 4
  type: RoomType;
  furniture: PlacedFurniture[];
}

export interface SanctuaryEstate {
  ownerId: string;
  estateLevel: number;
  rooms: EstateRoom[];
  maxRooms: number;
}

export const ROOM_CONSTRUCTION_REQS: Record<RoomType, number> = {
  GARDEN: 1,
  PARLOUR: 1,
  KITCHEN: 5,
  WORKSHOP: 15,
  PORTAL_CHAMBER: 50,
  ALTAR_ROOM: 75,
  THRONE_ROOM: 85,
};

export const ROOM_DIMENSION = 8; // 8x8 tiles per room

/**
 * Creates a new beginner Sanctuary estate.
 */
export function createEstate(ownerId: string): SanctuaryEstate {
  const defaultGarden: EstateRoom = {
    roomX: 2,
    roomY: 2,
    type: 'GARDEN',
    furniture: [],
  };

  return {
    ownerId,
    estateLevel: 1,
    rooms: [defaultGarden],
    maxRooms: 10,
  };
}

/**
 * Builds a new room in the estate grid at `(roomX, roomY)`.
 */
export function buildEstateRoom(
  estate: SanctuaryEstate,
  roomX: number,
  roomY: number,
  type: RoomType,
  playerConstructionLevel: number
): { success: boolean; reason?: string } {
  const req = ROOM_CONSTRUCTION_REQS[type];
  if (playerConstructionLevel < req) {
    return {
      success: false,
      reason: `Requires Construction level ${req} (Current: ${playerConstructionLevel})`,
    };
  }

  if (estate.rooms.length >= estate.maxRooms) {
    return { success: false, reason: 'Estate has reached maximum room capacity.' };
  }

  if (estate.rooms.some((r) => r.roomX === roomX && r.roomY === roomY)) {
    return { success: false, reason: 'A room already exists at this estate plot.' };
  }

  estate.rooms.push({
    roomX,
    roomY,
    type,
    furniture: [],
  });

  return { success: true };
}

/**
 * Places a furniture piece inside an estate room with boundary and collision checks.
 */
export function placeFurniture(
  estate: SanctuaryEstate,
  roomX: number,
  roomY: number,
  furniture: PlacedFurniture,
  playerConstructionLevel: number
): { success: boolean; reason?: string } {
  const room = estate.rooms.find((r) => r.roomX === roomX && r.roomY === roomY);
  if (!room) {
    return { success: false, reason: 'Room does not exist.' };
  }

  if (playerConstructionLevel < furniture.reqConstructionLevel) {
    return {
      success: false,
      reason: `Requires Construction level ${furniture.reqConstructionLevel}`,
    };
  }

  // 1. Room Boundary Check
  if (
    furniture.x < 0 ||
    furniture.y < 0 ||
    furniture.x + furniture.width > ROOM_DIMENSION ||
    furniture.y + furniture.height > ROOM_DIMENSION
  ) {
    return { success: false, reason: 'Furniture exceeds room boundaries.' };
  }

  // 2. Collision / Overlap Check with existing furniture
  for (const item of room.furniture) {
    const overlapX =
      furniture.x < item.x + item.width && furniture.x + furniture.width > item.x;
    const overlapY =
      furniture.y < item.y + item.height && furniture.y + furniture.height > item.y;

    if (overlapX && overlapY) {
      return { success: false, reason: `Overlaps with existing furniture '${item.name}'.` };
    }
  }

  room.furniture.push(furniture);
  return { success: true };
}

/**
 * Removes a furniture piece from an estate room.
 */
export function removeFurniture(
  estate: SanctuaryEstate,
  roomX: number,
  roomY: number,
  furnitureId: string
): boolean {
  const room = estate.rooms.find((r) => r.roomX === roomX && r.roomY === roomY);
  if (!room) return false;

  const initialCount = room.furniture.length;
  room.furniture = room.furniture.filter((f) => f.id !== furnitureId);
  return room.furniture.length < initialCount;
}
