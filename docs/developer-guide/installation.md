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

## Production Docker Deployment

This project uses Docker Compose to easily orchestrate the Next.js app, MariaDB, and the Socket.IO game server.

1. Configure `.env` with strong passwords.
2. Run the interactive setup script:
   ```bash
   sudo bash setup.sh
   ```
3. The script will automatically prompt you for database credentials, generate secrets, build the Docker images, and launch the containers.

## Database

This application relies on **MariaDB**. The Prisma schema (`prisma/schema.prisma`) is used to manage the database structure.
To manually push schema changes to the database without running migrations, use:
```bash
npx prisma db push
```
