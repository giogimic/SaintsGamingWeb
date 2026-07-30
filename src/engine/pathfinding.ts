export type Point = { x: number; y: number };

export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  mapWidth: number,
  mapHeight: number,
  isWalkable: (x: number, y: number) => boolean
): Point[] {
  // A simple BFS pathfinder
  if (startX === endX && startY === endY) return [];
  if (!isWalkable(endX, endY)) return [];

  const queue: Point[] = [{ x: startX, y: startY }];
  const parentMap = new Map<string, Point>();
  const visited = new Set<string>();
  
  const toKey = (x: number, y: number) => `${x},${y}`;
  visited.add(toKey(startX, startY));

  let found = false;

  const dirs = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.x === endX && current.y === endY) {
      found = true;
      break;
    }

    for (const dir of dirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      // Bounds check
      if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;

      const nKey = toKey(nx, ny);
      if (!visited.has(nKey) && isWalkable(nx, ny)) {
        visited.add(nKey);
        parentMap.set(nKey, current);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  if (!found) return [];

  // Reconstruct path
  const path: Point[] = [];
  let curr = { x: endX, y: endY };
  while (curr.x !== startX || curr.y !== startY) {
    path.unshift(curr);
    const pKey = toKey(curr.x, curr.y);
    curr = parentMap.get(pKey)!;
  }

  return path;
}
