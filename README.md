<div align="center">
  <h1>✨ Saints Gaming Web ✨</h1>
  <p><em>A modern, full-stack community management system.</em></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-13+-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Prisma-MariaDB-white?style=flat-square&logo=prisma" alt="Prisma" />
  </p>
</div>

<br />

> **Note:** Many features are currently in active development. This project is a learning endeavor and is not yet meant for production use. 🚀

---

## 🛠 Tech Stack

We've chosen a cutting-edge stack to ensure performance, type safety, and an incredible developer experience:

- **Framework:** Next.js 13+ (App Router) & React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS & shadcn/ui
- **Database:** Prisma ORM connected to MariaDB
- **Authentication:** NextAuth.js
- **Runtime:** Bun

---

## ✨ Features

- 🌓 **Modern UI:** Sleek, responsive design with built-in dark mode support.
- ⚡ **Performance:** Server-side rendering for blazing-fast load times.
- 🔒 **Secure Auth:** Seamless authentication with multiple providers.
- 💬 **Community Forums:** A fully featured, hierarchical forum system.
- 📰 **News & Announcements:** Keep your community updated effortlessly.
- 📊 **Status Monitoring:** Real-time server status tracking.
- 👤 **Rich Profiles:** Detailed user profiles and progression.
- 🛡️ **Admin Dashboard:** Comprehensive tools for community management.

---

## 🚀 Getting Started

Ready to explore? Follow these steps to get your local environment running.

### Prerequisites

Ensure you have the following installed:
- Node.js 18+ or Bun
- MariaDB 10.6+
- pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/saints-gaming-web.git
   cd saints-gaming-web
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure the environment:**
   ```bash
   cp .env.example .env
   ```
   *Don't forget to edit `.env` with your local database credentials.*

4. **Run migrations:**
   ```bash
   pnpm run migrate
   ```

5. **Start the magic:**
   ```bash
   pnpm run dev
   ```

---

## 🗄️ Database

This application relies on **MariaDB**. Please ensure your database server is running and accessible before starting the application.

---

## 💻 Development Commands

Here are some handy commands for your development workflow:

- `pnpm run dev` — Start the development server
- `pnpm run build` — Build the optimized production bundle
- `pnpm run start` — Start the production server
- `pnpm run lint` — Run ESLint to check code quality
- `pnpm run migrate` — Apply database migrations
- `pnpm run backup` — Safely backup your database
- `pnpm run restore` — Restore your database from a backup

---

## 🤝 Contributing

We love contributions! If you'd like to help out:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m '✨ Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is open-source and available under the **MIT License**.

---

## 📜 Changelog

### v1.4.6
- **Custom Asset Picker in Map Editor**: Integrated `GameAsset` library into World Map Editor NPC Placement mode to allow admins to select uploaded custom pixel art sprites.

### v1.4.5
- **Dynamic Game Quest & NPC Integration**: Connected custom `GameQuest` DB records and Map Editor placed NPCs directly into the cyber terminal engine (`components/cyber-terminal/index.tsx`, `game-canvas.tsx`).

### v1.4.4
- **Game Dev Admin Suite**: Introduced dedicated Game Dev category in Admin Overlay Shell.
- **Quest Creator**: Built Quest Creator UI (`/admin/game-dev/quests`) and `GameQuest` DB model for quest dialogues, item requirements, and payouts.
- **Asset Studio & Mass Importer**: Created Asset Studio (`/admin/game-dev/assets`) and `GameAsset` DB model supporting batch uploading and categorization of 16x16 / 32x32 pixel art sprites.
- **Map Editor Quest NPC Placement**: Upgraded World Map Editor (`/admin/map-editor`) with NPC Placement mode linked directly to registered Quests.

### v1.4.3
- **Map Editor Canvas Scaling**: Fixed mouse cursor coordinate offset on the World Map Editor by taking into account scale factor between canvas internal dimensions and CSS bounding client rect.
- **Profile Server Component Crash Fix**: Fixed runtime crash when rendering user MMO characters by removing invalid `onError` handler from Server Component.

### v1.4.1
- **MMO Architecture Phase 17 (Part 1)**: Transitioned from `GameSave` to a multi-character `GameCharacter` Prisma SQLite model.
- **Authoritative Server**: Scaffolded `game-server.js` using `socket.io` for synchronized movement and 4v4 Agility/Speed turn-based combat.
- **Character Creator**: Implemented `character-creator.tsx` with dynamic classes (Brawler, Invoker, Ranger, Artisan) setting preset skill levels.
- **Profile Integration**: Displayed active MMO characters on the public profile (`app/(main)/user/[username]/page.tsx`) with a "Play Now" launcher.
