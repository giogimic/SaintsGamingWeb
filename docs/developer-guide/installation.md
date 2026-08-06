# Saints Gaming Web Setup & Deployment

To ensure a stable environment and eliminate human error when managing the server (Node versions, dependencies, database syncing, and proxy configurations), you should **exclusively use our provided bash automation scripts**. Docker fully manages the Node.js environment internally, meaning you do not need to manually run `npm install` or maintain Node.js on the host OS.

## 1. Initial Deployment (Preferred)
To set up a fresh server:
1. Clone the repository:
   ```bash
   git clone https://github.com/giogimic/SaintsGamingWeb.git
   cd SaintsGamingWeb
   ```
2. Run the interactive setup script:
   ```bash
   ./scripts/setup.sh
   ```
3. The script will automatically prompt you for database credentials, generate secrets, build the Docker images, and launch the containers (including Caddy as a reverse proxy).

If the host **already has Saints + Caddy**, setup asks before changing anything. Prefer **subdomain-only** (additive) so the primary site is not rewritten:

```bash
./scripts/dev-proxy.sh status
./scripts/dev-proxy.sh add staging.example.com 3000
```

## 2. Updating the Server
When new code is pushed to the repository, **do not** manually run `git pull` or `npm` commands. Instead, simply run:

```bash
./scripts/update.sh
```

This script safely automates the entire **code** update pipeline:
1. Performs an automated database backup.
2. Pulls the latest code from `main`.
3. Rebuilds the Docker containers and applies any database schema changes.

For **content** hot-reload (maps, loot, quests) without restart, see [`info/gameplay-bible/26-studio-live-operations.md`](../gameplay-bible/26-studio-live-operations.md).
4. Restarts the Node server and reloads the Caddy proxy seamlessly.

## 3. Optional Go MMO (parallel realtime)

`./scripts/setup.sh` offers **Enable Go MMO** (recommended) and can set `NEXT_PUBLIC_GO_MMO_URL`, start Docker on **:3001**, and add a `go.` subdomain via additive Caddy.

Standalone / rerun:

```bash
./go-mmo/scripts/setup-go-mmo.sh --full
# or attach a subdomain only:
./go-mmo/scripts/setup-go-mmo.sh --proxy-only
```

See `go-mmo/README.md` and `info/CONTINUE.md`.

## Manual Local Development (Advanced)
If you are developing locally and do not want to use Docker:
1. Ensure you have Node.js 22+, MariaDB 10.6+, and `npm` installed.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and configure your database.
4. Run `npm run setup` to push the Prisma schema (`prisma/schema.prisma`).
5. Start with `npm run dev` (custom `server.ts` + Socket.io + GameEngine).
