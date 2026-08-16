# ⚜️ SAINTS GAMING ⚜️
### *Web Community Platform & 2.5D Sandbox RPG*

🌐 **Live Realm:** [**SaintsGaming.net**](https://SaintsGaming.net) &nbsp;•&nbsp; 🕹️ **Creator:** **GioGimic** &nbsp;•&nbsp; 💬 **Discord:** [Join Community](https://discord.saintsgaming.net)

```
   _____       _       _          _____                 _             
  / ____|     (_)     | |        / ____|               (_)            
 | (___   __ _ _ _ __ | |_ ___  | |  __  __ _ _ __ ___  _ _ __   __ _ 
  \___ \ / _` | | '_ \| __/ __| | | |_ |/ _` | '_ ` _ \| | '_ \ / _` |
  ____) | (_| | | | | | |_\__ \ | |__| | (_| | | | | | | | | | | (_| |
 |_____/ \__,_|_|_| |_|\__|___/  \_____|\__,_|_| |_| |_|_|_| |_|\__, |
                                                                  __/ |
                                                                 |___/ 
```

![Version](https://img.shields.io/badge/Release-v2.1.282-purple?style=for-the-badge&logo=gamemaker)
![Live Site](https://img.shields.io/badge/Live_Site-SaintsGaming.net-0ea5e9?style=for-the-badge&logo=googlechrome&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_15-React_19-black?style=for-the-badge&logo=next.js)
![Go MMO](https://img.shields.io/badge/Go_MMO-3001-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Babylon.js](https://img.shields.io/badge/Babylon.js-2.5D_WebGL-F58025?style=for-the-badge&logo=babylonjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-SQLite%2FMariaDB-5A67D8?style=for-the-badge&logo=prisma&logoColor=white)

*A hands-on indie project by **GioGimic** — a sandbox environment for testing game systems, real-time multiplayer networking, and full-stack web community tooling.*

---

## 🌟 What is Saints Gaming?

**Saints Gaming** ([SaintsGaming.net](https://SaintsGaming.net)) is an all-in-one web platform and gaming sandbox. It connects a modern web community (forums, user control panel, achievements, social feed) with an embedded **2.5D multiplayer top-down RPG** and a built-in game editor (**Saints Studio**).

It is an active personal sandbox project by **GioGimic**, built to experiment with custom WebGL rendering, authoritative socket networking, deep skill systems, and live in-browser world authoring.

---

## 🎮 Key Systems at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SAINTS GAMING ECOSYSTEM                         │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│        🌐 WEB PLATFORM       │        🕹️ GAME CLIENT        │   🛠️ STUDIO   │
│  • SaintsGaming.net Portal   │  • Babylon 2.5D WebGL        │  • Tile Paint │
│  • Community Forums & News   │  • 27-Skill Progression      │  • NPC Placer │
│  • Profile Showcases & UCP   │  • Dual-Combat Engine        │  • Catalogs   │
│  • Realtime Social Feeds     │  • Mobile Touch / Joystick   │  • PIE Tester │
└──────────────────────────────┴──────────────────────────────┴───────────────┘
```

- ⚔️ **27-Skill Matrix & Progression:** Full 1–99 skill trees across Combat (9), Gathering (5), Artisan (8), and Support (5) with Grandmaster Capstones (Max Cape, Master Totem Relic).
- 👾 **Dual-Combat Mechanics:** Seamless real-time overworld mob combat featuring hotbar abilities, combined with instanced turn-based creature battles and capture crystals.
- 🗺️ **Saints Studio (`/studio`):** Built-in level editor with dual-grid visual GID and collision logic painting, entity spawners, dialogue node editors, and Play-In-Editor (PIE) testing.
- ⚡ **Hybrid Realtime Backend:** High-performance standalone Go MMO socket server (`go-mmo/`) on `:3001` with Area-of-Interest (AOI) spatial sharding and SQLite persistence.
- 📱 **Adaptive Mobile Controls:** Virtual joystick, quick action pad, and fullscreen launcher for mobile and tablet web browsers.
- 📚 **In-Depth Documentation Wiki:** Full system breakdown available in [`docs/README.md`](docs/README.md).

---

## 🧭 Project Navigation & Documentation

| Section | Description | Link |
| :--- | :--- | :--- |
| 🌐 **Live Portal** | Official Saints Gaming web community | [**SaintsGaming.net**](https://SaintsGaming.net) |
| 📚 **Complete Wiki** | Index of all game & studio system documentation | [`docs/README.md`](docs/README.md) |
| 🎮 **Game Systems** | Loop, 27 skills, combat, networking & economy | [`docs/game-systems/README.md`](docs/game-systems/README.md) |
| 🛠️ **Studio Manual** | Editor architecture, tile painting, NPCs & catalogs | [`docs/studio/README.md`](docs/studio/README.md) |
| 📜 **Changelog** | Version history and milestone release logs | [`CHANGELOG.md`](CHANGELOG.md) |
| 🎨 **Attribution** | Tuxemon & Liberated Pixel Cup (LPC) licenses | [`docs/TUXEMON_ATTRIBUTION.md`](docs/TUXEMON_ATTRIBUTION.md) |

---

## 💻 Tech Stack

- **Frontend & Web Core:** Next.js 15+ (App Router), React 19, TypeScript
- **Styling & UI:** Tailwind CSS, Custom `sg-*` Design Tokens, Lucide Icons
- **Database & ORM:** Prisma ORM with SQLite (dev/embedded) and MariaDB (prod)
- **Game Engine & Rendering:** Babylon.js 2.5D Orthographic Engine (`BabylonEngine.ts`)
- **Realtime Networking:** Go MMO service (`go-mmo/`) on `:3001` + Node.js socket fallback (`server.ts`)
- **Audio & FX:** WebAudio API synthesized audio effects and particle emitters

---

## 🚀 Quickstart & Server Deployment

```bash
# 1. Interactive environment setup & dependency provisioning
./scripts/setup.sh

# 2. Start development server (Next.js + Socket Engine)
npm run dev

# 3. Launch Go MMO backend (Required for realtime multiplayer on :3001)
./go-mmo/scripts/setup-go-mmo.sh --full

# 4. Run automated test suite (Vitest)
npm test
```

For production deployment and automated Caddy reverse proxy management, refer to `./scripts/setup.sh` and `./scripts/update.sh`.

---

## 📄 License & Credits

- **Platform & Engine Code:** Private / Proprietary by GioGimic.
- **Game Assets:** Tuxemon assets and LPC sprites are licensed under GPL-3.0 / CC BY-SA 4.0. See [`docs/TUXEMON_ATTRIBUTION.md`](docs/TUXEMON_ATTRIBUTION.md) for full license details.
