# Saints Tamer MMO: Architecture & Systems Breakdown

This document provides a comprehensive overview of the systems driving the "Saints Tamer MMO", outlining how we handle dynamic importing, asset optimization, database isolation, and integration into the existing Saints Web Next.js 15 app router.

---

## 1. Dynamic Imports & Lazy Loading

To ensure the MMO does not negatively impact the initial load times of the Saints Gaming website, the game engine is heavily isolated using Next.js **Dynamic Imports** (`next/dynamic`).

### Implementation Strategy
The entire `<CyberTerminal>` application wrapper (which houses the 2D Canvas, Store, UI Overlays, and Socket.io clients) is imported strictly on the client-side.
```tsx
const CyberTerminal = dynamic(() => import('@/components/cyber-terminal/cyber-terminal'), {
  ssr: false,
  loading: () => <TerminalBootSequence />
});
```
- **SSR is explicitly disabled**: Since the game relies on HTML5 Canvas APIs, `requestAnimationFrame`, window objects, and Phaser/EasyStar, running it on the Next.js server would cause catastrophic hydration errors. 
- **Code Splitting**: The game code is split into its own JavaScript chunk. If a user never clicks "Play Now" and navigates to the game route, their browser never downloads the heavy game logic.

---

## 2. Asset Optimization Strategy

We use raw `.png` pixel art assets alongside dynamic programmatic drawing to keep bundle sizes minuscule. 

### Texture Mapping
Instead of large, pre-rendered composite maps, we use an atomic **Tileset Architecture**:
- `tile_floor.png`, `tile_wall.png`, `tile_encrypted.png`, etc.
- A single 16x16 or 32x32 image is downloaded and then cloned recursively across the HTML5 Canvas using a 2D integer array (the map layout matrix).
- This means a massive 100x100 tile map costs exactly the same amount of network bandwidth as a 10x10 map—just a few kilobytes for the raw JSON arrays.

### Character & Daemon Sprites
All Daemons (creatures) are kept modular:
- Sprites are preloaded asynchronously within `game-canvas.tsx` before the game loop begins rendering.
- Images are requested via optimized paths in `/public/game-assets/` and cached locally by the browser. 
- We do not use base64 embedded images, as they pollute the JavaScript bundle size.

---

## 3. Database Isolation

The MMO operates inside the existing Saints Web ecosystem, but handles state locally (in RAM) for high-performance loops, and persists to the database asynchronously.

### The Prisma Schema Additions
Two tables handle MMO isolation:
- `MmoCharacter`: Bound `1-to-1` to the parent `User` record. Stores structural data (Level, XP, Location, Currency).
- `MmoDaemon`: Represents individual creatures owned by a character. Stores dynamic stats (HP, Attack, Level, Element) and is linked via `characterId`.

### Data Flow
1. **Initial Load**: Upon launching the game, a secure Next.js Server Action (`getCharacter(userId)`) fetches the user's `MmoCharacter` and injects it into the Zustand store.
2. **In-Memory Volatility**: While the user walks around, their `(x, y)` coordinates are tracked exclusively in the client's `useGameStore`. This prevents hammering the database with a write operation 60 times a second.
3. **Safe Updates**: When key events trigger (e.g. Map Transition, Item Pickup, Daemon Caught, Logging Out), an asynchronous background POST pushes the payload to the server (`saveCharacterState()`).

---

## 4. UI Accessibility: Launching the Game

To make the game highly accessible and visible, we've integrated it directly into the primary UI loop of the user's profile.

### Global Profile Access
Instead of forcing users to navigate to their public profile (e.g., `saintsgaming.net/user/giogimic`), we've injected the game launcher into the **Authenticated Hub**:
- **Location**: `https://saintsgaming.net/profile`
- **Mechanism**: At the bottom of the profile hub, users will see the "Saints Tamer MMO" widget.
- **Dynamic State**: The widget checks if the user has an `MmoCharacter`. 
  - If they do, it previews their active Daemons and displays a **"Play Now"** button routing them to `/profile/terminal`.
  - If they don't, it routes them to the **Character Creator** sequence.

### Safe Guards
Route protection is enforced at `/profile/terminal`. If a user logs out, the game route instantly ejects them back to `/login`, terminating the Socket.io connection and halting the rendering loop to free up device resources.
