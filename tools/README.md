# 🛠️ Saints Gaming Python Utilities (`/tools/`)

This directory contains utility scripts to manage, monitor, and deploy the live `saintsgaming.net` infrastructure.

## 🚀 Available Tools

### 1. `update_live.py` (Full Production Deployment)
Pulls the latest code from `main`, rebuilds the Docker container (`--no-cache`), preserves MariaDB configuration and database volume, and restarts the web container cleanly.
```bash
python tools/update_live.py
```

### 2. `restart_live.py` (Fast Container Restart)
Restarts the `saints-gaming-web` container without triggering a full rebuild.
```bash
python tools/restart_live.py
```

### 3. `check_status.py` (Docker Status Monitor)
Displays current container health (`docker ps`).
```bash
python tools/check_status.py
```

### 4. `check_logs.py` (Container Log Inspection)
Tails the last 50 lines of logs from the production web container.
```bash
python tools/check_logs.py
```

### 5. `seed_database.py` (Database Seeder)
Triggers `prisma/seed.ts` inside the running `saints-gaming-web` container to populate default database records.
```bash
python tools/seed_database.py
```
