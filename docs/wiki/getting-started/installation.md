# Installation & Local Development

This guide covers setting up your local development environment for **Saints Gaming**, including Node.js prerequisites, Prisma database synchronization, and running the dual-engine runtime.

---

## 📋 Prerequisites

Ensure your workstation meets the minimum environment specifications:

- **Node.js**: `v22.13.0` or higher (`node -v`)
- **npm**: `v10.0.0` or higher (`npm -v`)
- **Operating System**: Windows 11 / Linux (Ubuntu 22.04+) / macOS (M1/M2/Intel)
- **Go (Optional for MMO service)**: `v1.22+` if running standalone Go server locally

---

## 🛠️ Step-by-Step Installation

### 1. Clone the Repository
```bash
git clone https://github.com/giogimic/SaintsGamingWeb.git
cd SaintsGamingWeb
```

### 2. Run the Automated Setup
The `npm run setup` command automatically provisions default environment variables (`.env`), generates Prisma client bindings, and synchronizes the local MariaDB/MySQL database schema.

```bash
npm install
npm run setup
```

> [!NOTE]
> Local development defaults to MariaDB/MySQL at `prisma/db/mysql_data`. No external MySQL or Redis services are required for local play and editing.

### 3. Start the Development Server
```bash
npm run dev
```

The unified Next.js + Socket.io + GameEngine server will launch at:
- 🌐 **Web & MMO App**: [http://localhost:3000](http://localhost:3000)
- 🛠️ **World Studio**: [http://localhost:3000/studio](http://localhost:3000/studio)
- 🎮 **Lobby Game**: [http://localhost:3000/lobby](http://localhost:3000/lobby)

---

## 🧪 Running Test Suites & Validation

Saints Gaming uses **Vitest** for lightning-fast test execution and automated linting scripts:

```bash
# Run all unit and integration tests (835+ tests)
npm test

# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Run automated game data validation
npm run validate:data
```

---

## 🔑 Environment Configuration (`.env`)

Key configuration flags available in `.env`:

| Key | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical site origin for auth redirects and webhook callbacks. |
| `AUTH_SECRET` | `secret...` | NextAuth encryption secret (`openssl rand -base64 32`). |
| `DATABASE_URL` | `file:./db/mysql_data` | Prisma MariaDB/MySQL database connection string. |
| `NEXT_PUBLIC_GO_MMO_URL` | `http://localhost:3001` | Dedicated Go MMO realtime socket server endpoint. |
| `ENABLE_TS_GAME_ENGINE` | `0` | Force fallback to Node.js GameEngine when Go MMO server is active. |
