# Saints Gaming — Web Architecture & Persistence (10.txt)

Saints Gaming is not a standalone executable; it is embedded deeply within a Next.js 16 web application. This provides a massive advantage for user acquisition, social loops, and account management, but it requires strict architectural boundaries.

---

# 1. The Next.js & Game Engine Boundary

The game is a React island inside the wider Saints Web platform. 

### The React Boundary (`'use client'`)
* The core game client is instantiated inside `<CyberTerminal />` (or `<GameCanvasBabylon />`).
* Because it uses Babylon.js, WebGL, and `window` objects, this component MUST be dynamically imported with `ssr: false`.
* The game client should **never** perform direct database calls. It must rely entirely on WebSockets (Socket.io) or Next.js Server Actions for state mutation.

### The UI Boundary
* The game world (3D Canvas) renders the terrain, players, and visual effects.
* **All UI** (Hotbars, Inventory, Chat, Dialogues, Turn-Based Battle Menus) is rendered via standard React/Tailwind/CSS on top of the canvas using `Zustand` to bridge the gap.
* This ensures the UI remains accessible, resolution-independent, and easily stylable.

---

# 2. Authentication & Security (NextAuth)

Security is paramount. The client cannot simply claim to be a specific user.

1. **Login**: Players log in via standard NextAuth (Credentials or OAuth).
2. **The Handshake**: When the React game component connects to the Socket.io server, it passes a secure, signed JWT token or session cookie.
3. **Validation**: The socket server verifies the session. If the token is invalid or missing, the socket connection is rejected immediately.
4. **Spoofing Prevention**: A socket connection is tied to the NextAuth User ID. The client cannot send a `combat_cast` event claiming to be a different player ID.

---

# 3. Persistence Strategy (Prisma)

Data must survive server restarts and browser crashes.

### Hot State vs Cold State
* **Hot State (In-Memory)**: While a player is logged in, their active position, health, and temporary buffs are stored in the Game Server's RAM (or Redis in Phase 4). This allows for instant 60-tick calculations without hammering the SQL database.
* **Cold State (PostgreSQL/MySQL via Prisma)**: 
  * The database is the ultimate source of truth.
  * The server periodically flushes Hot State to Cold State (e.g., every 60 seconds, or on major events like a level up or item drop).
  * If the server crashes, players only lose a maximum of 60 seconds of progress.

### The Prisma Schema (Core Models)
* `User`: The NextAuth account.
* `GameCharacter`: The physical avatar (Name, Level, Combat Style, Cosmetics).
* `Inventory`: Structured JSON representing items.
* `PlayerCreature`: A captured creature owned by the player, detailing its specific stats, IVs, and nickname.
* `Map`: Serialized JSON data for the world.

---

# 4. Web Integration & Social Loops

The website is the metagame.

### The Feed
Saints Web features a TikTok/Twitter-style feed. When a player achieves something remarkable in-game (e.g., catching a Legendary creature, reaching Level 50), the Game Server automatically triggers a Next.js Server Action to publish a `SocialPost` to the feed.

### Pinned Creatures & Profiles
Every user has a public web profile. They can select one `PlayerCreature` to be their "Pinned" companion. This pulls the pixel-art sprite from the game engine and renders it directly on their social profile, encouraging vanity and collecting.

### The Marketplace
Trading can happen in-game via direct P2P menus, but asynchronous trading (like a Grand Exchange or Auction House) happens directly on the Next.js website. Players can browse the marketplace from their phone on the bus, buy an item, and it will be in their game inventory when they log in on Desktop.

---

# 5. Mobile & Responsive Design

While the Desktop experience focuses on the keyboard (WASD + Hotkeys), the React UI must gracefully degrade for mobile browsers.

* **Touch Controls**: A virtual D-Pad or click-to-move overlay handles navigation on touch devices.
* **Menu Stacking**: The Hotbar and Chat windows must collapse or scale intelligently on portrait screens.
* **Turn-Based Battles**: The Turn-Based creature battle system is inherently mobile-friendly (menu-driven). This ensures players can comfortably grind encounters on their phones without requiring high-APM (Actions Per Minute) inputs.
