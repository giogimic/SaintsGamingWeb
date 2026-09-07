# Saints Gaming

> **Time To Play** — Welcome to the Saints Gaming community platform & game project!

Hey everyone! Welcome to the repository for **Saints Gaming**. 

I'm building this for our community. This is a passion project I build for fun in my spare time, designed to serve as our community's home base. It's a completely open-source hybrid that fuses a web forum with an in-browser 2.5D multiplayer world!

---

## 🎮 What is Saints Gaming?

Saints Gaming started way back in 2007 as a chill group of friends hanging out on TeamSpeak, playing SA-MP, FiveM, Minecraft, and whatever else sounded fun. Over the years, our motto has always been simple: *Time To Play* — just hang out, game together, and have a good time with zero drama.

This project brings our community hub together with an interactive multiplayer game:

- **The Community Hub**: Forums to chat, news updates, game server status trackers (so you can see who's online on our servers), and a FiveM player portal.
- **The Lobby (The Game)**: A browser-based multiplayer world where you can drop in as a character, explore, and hang out with friends directly in your browser.
- **World Studio**: A built-in map builder where you can paint terrain, build structures, set up areas, and test them live.

---

## 🛠️ How to Run it Locally

If you want to poke around the code, run it on your own machine, or test things out:

### What you need
- **Node.js** (v22 or newer recommended)
- **Git**

### Steps

```bash
# 1. Clone this repository
git clone https://github.com/giogimic/SaintsGamingWeb.git
cd SaintsGamingWeb

# 2. Install dependencies and set up the local database
npm run setup

# 3. Start the local server
npm run dev
```

Once it's running, just open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 📝 Changelog

### v2.1.771 - Voxel Canvas UX, Spawn Loop & Freezing Fixes
- **Voxel Canvas Editing Fixed:** Allowed dynamic chunk generation when painting solid blocks on blank procedural/empty maps. Voxel raycasting tests and resolution math has been fixed to align with the non-centered coordinate system mapping.
- **Async Flood Fill:** Refactored the Voxel Volumetric Fill tool into an asynchronous routine, breaking the 65,000 block fill queue into sub-chunks. This totally resolves the UI thread freezing bugs observed on large empty maps.

### v2.1.771
- Fixed a bug where voxel maps would lose their `mapType` during canvas hydration, causing them to become uneditable and convert to tile maps when saved.
### v2.1.768
- **Voxel Canvas Decoupling**: Completely stripped legacy 2D Tile logic (freeform layers, 2D brushes, and layer isolation tools) from `VoxelCanvasBabylon.tsx`, ensuring a pure 3D canvas environment.
- **Voxel Map Persistence**: Fixed an issue where the database would drop voxel chunks during fallback saves and revert Voxel maps into Tile/Hybrid maps.
- **Editor UI Glitches**: Resolved the "Green Box" clipping glitch caused by empty voxel maps triggering the 2.5D logic grid fallback geometry.
- **Voxel Tool Support**: Voxel painting tools now work properly by disabling the invisible 2D click-intercept plane (`mapPickPlane`) when in Voxel mode, allowing 3D raycasting against chunk meshes.

### v2.1.767
- **Hero Studio UI**: Replaced the raw text inputs for Sprite Key and Sprite Bundle ID with a unified "Select Character Sprite" button.
- **Web Setup UI**: Updated the `EntitySetupStep` to use the unified `SpriteBrowser` catalog instead of the old `RoleAwareAssetPicker`, bridging the UI consistency between the setup phase and Hero Studio.
- **Spawn Logic Integration**: Ensured that the Character Creator spawns players properly on the server by relying on the `getSpawnMapId()` Server Action which correctly reads the `SPAWN_MAP_ID` site setting instead of a hardcoded map name fallback.
- **Atlas Hub Sync**: Setting a map as a Hub from the World Atlas will now properly synchronize with the `SPAWN_MAP_ID` site setting so the changes propagate globally.

### v2.1.750
- **Tile Studio UX:** Added a dedicated Logic Palette for collision and game logic tile painting when `activeLayerIdx === -1`.
- **Brush Patterns:** Improved `activeBrushPattern` to work smoothly alongside the Paint brush tool, stamping multi-tile selections natively without relying on a distinct Paste mode.
- **Creature Engine:** Extended the `AbilityDictionary` and `CreatureTemplate` Prisma schema models with `Mythos` references to accurately support creature classification as outlined in the game bible taxonomy.

---

## 📖 Documentation

If you are looking for **deep technical breakdowns**, engine architecture, and creator guides, please check out our interactive **Wiki** directly on the website once you have the app running, or navigate to the `/wiki` page on saintsgaming.net!

*(Note to developers/AI: All internal engine architecture and game bibles are stored privately inside the `.docs` folder for local development.)*

---

## 💬 Community & Links

Come say hello, hang out, or give feedback! We'd love to have you:

- **Website:** [https://saintsgaming.net](https://saintsgaming.net)
- **Discord:** [discord.saintsgaming.net](https://discord.saintsgaming.net)
- **GitHub:** [giogimic/SaintsGamingWeb](https://github.com/giogimic/SaintsGamingWeb)

---

## 📄 License & Notes

- **Creator:** GioGimic
- **License:** [Business Source License 1.1 (BSL-1.1)](LICENSE). Free for personal use, learning, modding, and community self-hosting.
- © 2007–2026 Saints Gaming.
