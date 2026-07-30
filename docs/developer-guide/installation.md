# Saints Gaming Web Setup & Deployment

## Prerequisites

Ensure you have the following installed:
- Node.js 18+ or Bun
- MariaDB 10.6+
- pnpm or npm

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/giogimic/SaintsGamingWeb.git
   cd SaintsGamingWeb
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment:**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` with your local database credentials.*

4. **Start the server:**
   ```bash
   npm run dev
   ```

## Production Docker Deployment (Preferred)

To completely eliminate human error when managing the production server (Node versions, dependencies, database syncing, and proxy configurations), you should exclusively use our provided bash automation scripts. Docker fully manages the Node.js environment internally, meaning you **do not** need to manually run `npm install` or maintain Node.js on the host OS.

### Initial Setup
To set up a fresh server:
1. Run the interactive setup script:
   ```bash
   ./scripts/setup.sh
   ```
2. The script will automatically prompt you for database credentials, generate secrets, build the Docker images, and launch the containers (including Caddy as a reverse proxy).

### Updating the Server
When new code is pushed to the repository, **do not** manually run `git pull` or `npm` commands. Instead, simply run:

```bash
./scripts/update.sh
```

This script safely automates the entire update pipeline:
1. Performs an automated database backup.
2. Pulls the latest code from `main`.
3. Rebuilds the Docker containers and applies any database schema changes.
4. Restarts the Node server and reloads the Caddy proxy seamlessly.

## Database

This application relies on **MariaDB**. The Prisma schema (`prisma/schema.prisma`) is used to manage the database structure.
To manually push schema changes to the database without running migrations, use:
```bash
npx prisma db push
```
