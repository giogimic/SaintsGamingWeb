# ⚜️ SAINTS GAMING ⚜️
### *Gaming Community Since 2007*

🌐 **Website:** [**SaintsGaming.net**](https://SaintsGaming.net) &nbsp;•&nbsp; 🕹️ **Creator:** **GioGimic** &nbsp;•&nbsp; 💬 **Discord:** [discord.saintsgaming.net](https://discord.saintsgaming.net)

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

![Release](https://img.shields.io/badge/Version-v2.1.459--31-purple?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js_15-React_19-black?style=for-the-badge&logo=next.js)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Babylon.js](https://img.shields.io/badge/Babylon.js-2.5D_WebGL-F58025?style=for-the-badge&logo=babylonjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-SQLite%2FMariaDB-5A67D8?style=for-the-badge&logo=prisma&logoColor=white)

---

## 🌟 Welcome to Saints Gaming

**Saints Gaming** originally started out as an online gaming community back in **2007**. This repository is our brand new website, rebuilt from scratch as a modern full-stack community hub with embedded game tools and social features.

The idea here is simple: bring together a full gaming platform—forums, news, user profiles, a media feed, an in-game gold economy, and a 2.5D multiplayer world with built-in creative studio tools—all running right inside the web browser.

---

## 🎮 What's On the Site

- 💬 **Community Forums & News:** Discussion boards, member threads, gaming news articles, and community announcements.
- 📱 **Integrated Feed & Shorts:** A social feed with video shorts playback, audio stems, comments, and creator tips.
- 🪙 **Unified Gold Economy:** Earn gold through site activity and content views, tip creators directly on posts, and access your gold in-game at physical bank locations to transfer funds between your character inventory and account bank.
- 🕹️ **The Lobby (2.5D Game):** An embedded browser game featuring top-down multiplayer movement, chat, exploration, and combat powered by Babylon.js WebGL.
- 🛠️ **Saints Studio (`/studio`):** An in-browser map and world builder for admins and creators to paint map layers, set collision logic, place NPCs and spawners, write quest dialogues, and playtest maps instantly.
- 👤 **User Control Panel (UCP):** Custom member profiles, avatars, showcase widgets, achievements, and settings.

---

## 💻 Tech Stack

- **Frontend & App:** Next.js 15+ (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS with custom glassmorphism design tokens
- **Database:** Prisma ORM (SQLite for simple local setups, MariaDB/MySQL in production)
- **Game Engine:** Babylon.js 2.5D orthographic renderer
- **Multiplayer & Realtime:** Optional Go MMO socket server (`the-lobby/`) on `:3001` with Node.js socket fallback
- **Authentication:** Auth.js (NextAuth v5) with credentials, sessions, and role permissions

---

## 🚀 Running Locally

Getting the project up and running locally is straightforward:

```bash
# 1. Automated setup & dependency install (copies .env if needed and sets up database)
./scripts/setup.sh

# 2. Run the dev server
npm run dev

# 3. (Optional) Run The Lobby Go server for realtime multiplayer on :3001
./the-lobby/scripts/setup-the-lobby.sh --full

# 4. Run automated tests
npm test
```

Once running, open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💬 Community & Feedback

If you want to hang out, chat about games, share feedback, or follow development updates:
- **Website:** [SaintsGaming.net](https://SaintsGaming.net)
- **Discord:** [discord.saintsgaming.net](https://discord.saintsgaming.net)
