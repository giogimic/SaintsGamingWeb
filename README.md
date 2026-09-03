# Saints Gaming

> **Time To Play** — Welcome to the Saints Gaming community site & game project!

Hey everyone! Welcome to the repository for **Saints Gaming**. 

This is our community website combined with a multiplayer browser game idea that I'm actively tinkering on. 

A quick heads-up: **this is very much a work in progress and far from complete!** I'm not a professional game developer or software engineer—this is a passion project I build for fun in my spare time for our gaming community. You'll definitely run into rough edges, messy experiments, and things that are actively changing as I learn and build.

---

## 🎮 What is Saints Gaming?

Saints Gaming started way back in 2007 as a chill group of friends hanging out on TeamSpeak, playing SA-MP (San Andreas Multiplayer), FiveM, Minecraft, and whatever else sounded fun. Over the years, our motto has always been simple: *Time To Play* — just hang out, game together, and have a good time with zero drama.

This project brings our community hub together with an interactive multiplayer game:

- **The Community Hub**: Forums to chat, news updates, game server status trackers (so you can see who's online on our servers), and a FiveM player portal.
- **The Lobby (The Game)**: A browser-based multiplayer world where you can drop in as a character, explore different areas, collect items, level up skills, and battle creatures with friends directly in your browser.
- **World Studio**: A built-in creative map builder where you can paint terrain, build structures, set up areas, and test them live without needing external mod tools.

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

To run the automated tests:
```bash
npm test
```

---

## 🗺️ What's Under the Hood (In Plain English)

For anyone curious how it's put together without all the buzzwords:

- **Frontend & Website**: Built with Next.js and React, styled with Tailwind CSS.
- **In-Browser Game & 3D**: Uses Babylon.js to render the 2.5D game view and voxel maps inside an HTML5 canvas.
- **Realtime Multiplayer**: Runs through Socket.io (with an optional Go server for bigger multiplayer rooms).
- **Database**: Prisma handles our database connections (SQLite for quick local dev, MariaDB/MySQL for production).

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
