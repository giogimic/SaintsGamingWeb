# Saints Gaming Web Setup & Deployment

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

## Manual Local Development (Advanced)
If you are developing locally and do not want to use Docker:
1. Ensure you have Node.js 22+, MariaDB 10.6+, and `npm` installed.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and configure your database.
4. Run `npm run setup` to push the Prisma schema (`prisma/schema.prisma`).
5. Start the server with `npm run dev`.
