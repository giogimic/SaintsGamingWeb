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

![Version](https://img.shields.io/badge/Release-v2.1.450-purple?style=for-the-badge&logo=gamemaker)
![Live Site](https://img.shields.io/badge/Live_Site-SaintsGaming.net-0ea5e9?style=for-the-badge&logo=googlechrome&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_15-React_19-black?style=for-the-badge&logo=next.js)
![Go MMO](https://img.shields.io/badge/Go_MMO-3001-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Babylon.js](https://img.shields.io/badge/Babylon.js-2.5D_WebGL-F58025?style=for-the-badge&logo=babylonjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-SQLite%2FMariaDB-5A67D8?style=for-the-badge&logo=prisma&logoColor=white)

*Hey everyone! This is my personal indie passion project — an all-in-one gaming hub, web community, and 2.5D browser MMO sandbox where I test and build custom game systems, realtime networking, and in-browser world-building tools.*

---

## 🌟 What is Saints Gaming?

**Saints Gaming** ([SaintsGaming.net](https://SaintsGaming.net)) is built from the ground up to combine a modern gaming community (forums, user dashboards, achievements, social feed, live chat) with an embedded **2.5D top-down multiplayer RPG** and a live, in-browser map and game editor (**Saints Studio**).

Whether you're exploring the seamless overworld, leveling up 27 unique skills, jumping into real-time or turn-based creature battles, or painting new maps right inside your browser with Studio, everything runs seamlessly on one cohesive platform.

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

- ⚔️ **27-Skill Matrix & Progression:** Classic 1–99 skill grinding across Combat (9), Gathering (5), Artisan (8), and Support (5) with Grandmaster Max Capes and endgame relics.
- 👾 **Dual-Combat Engine:** Real-time overworld monster combat with ability hotbars, alongside turn-based collection battles and capture mechanics.
- 🗺️ **Saints Studio (`/studio`):** Complete in-game level editor with multi-layer visual tile painting, collision logic, NPC and monster spawners, dialogue node graphs, and Play-In-Editor (PIE) testing.
- ⚡ **Hybrid Realtime Backend:** High-speed Go MMO socket server (`the-lobby/`) on `:3001` handling Area-of-Interest (AOI) spatial sharding, tick simulation, and state persistence.
- 📱 **Mobile Ready:** Responsive touch controls, virtual joystick, quick action pads, and full-screen browser gameplay on phones and tablets.
- 📚 **Full Documentation Wiki:** Dive into the deep architecture and mechanics breakdown in [`docs/README.md`](docs/README.md).

---

## 🧭 Project Navigation & Documentation

| Section | Description | Link |
| :--- | :--- | :--- |
| 🌐 **Live Portal** | Official Saints Gaming web community | [**SaintsGaming.net**](https://SaintsGaming.net) |
| 📚 **Complete Wiki** | Index of all game & studio system documentation | [`docs/README.md`](docs/README.md) |
| 🎮 **Game Systems** | Game loop, 27 skills, combat, networking & economy | [`docs/game-systems/README.md`](docs/game-systems/README.md) |
| 🛠️ **Studio Manual** | Editor architecture, tile painting, NPCs & catalogs | [`docs/studio/README.md`](docs/studio/README.md) |
| 📜 **Changelog** | Full version history and milestone release notes | [`CHANGELOG.md`](CHANGELOG.md) |

---

## 💻 Tech Stack

- **Frontend & Web Core:** Next.js 15+ (App Router), React 19, TypeScript
- **Styling & UI:** Tailwind CSS, Custom `sg-*` Design System Tokens, Lucide Icons
- **Database & ORM:** Prisma ORM with SQLite (dev/local) and MariaDB (prod)
- **Game Engine & Rendering:** Babylon.js 2.5D Orthographic Engine (`BabylonEngine.ts`)
- **Realtime Networking:** The Lobby Go MMO server (`the-lobby/`) on `:3001` + Node.js fallback (`server.ts`)
- **Audio & FX:** WebAudio API dynamic soundscapes, music jukebox, and particle effects

---

## 🚀 Quickstart & Running Locally

```bash
# 1. Automated environment setup & dependency install
./scripts/setup.sh

# 2. Start development server (Next.js + Socket Engine)
npm run dev

# 3. Launch The Lobby Go backend (For realtime multiplayer on :3001)
./the-lobby/scripts/setup-the-lobby.sh --full

# 4. Run automated test suite (Vitest)
npm test
```

For production deployment and automated reverse proxy management, check out `./scripts/setup.sh` and `./scripts/update.sh`.

---

## 📄 License & Credits

- **Platform & Engine Code:** Built with passion by GioGimic. All rights reserved.
- **Community:** Feel free to hop into our [Discord](https://discord.saintsgaming.net) to chat, share feedback, or check out the latest development progress!
