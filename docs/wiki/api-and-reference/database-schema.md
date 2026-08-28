# Database Schema & Prisma Architecture

Saints Gaming uses **Prisma ORM** backed by MariaDB/MySQL for local development (`prisma/db/mysql_data`) with seamless migration paths to MariaDB / MySQL for production deployments.

---

## 1. Database Architecture & Datasource

The database configuration in `prisma/schema.prisma` is optimized for high query velocity and structured JSON serialization:

```prisma
datasource db {
  provider = "MariaDB/MySQL"
  url      = env("DATABASE_URL")
}

generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}
```

---

## 2. Core Entity Models & Schema Definitions

| Model | Table Name | Purpose & Key Fields |
| :--- | :--- | :--- |
| **`User`** | `User` | User accounts, auth credentials, permissions (`permissionLevel`), roles, coins, XP, and profile image relations. |
| **`GameCharacter`**| `GameCharacter` | 2.5D MMO character profiles, active sprite IDs, class archetypes, and serialized Zustand `stateData` blobs. |
| **`WorldMap`** | `WorldMap` | Map documents storing `gridData` (Layer -1), `tileLayersData` (GIDs), `entitiesData`, `npcsData`, and `gatesData`. |
| **`Thread` / `Reply`**| `Thread`, `Reply` | Community forum discussion threads, Markdown bodies, pinned flags, subcategory relations, and emoji reactions. |
| **`NewsArticle`** | `NewsArticle` | CMS news articles, published status, author relations, media assets, and promotional URLs. |
| **`Modpack`** | `Modpack` | Downloadable client modpacks, versioning, installation guides, and changelogs. |
| **`SiteSetting`** | `SiteSetting` | Global key-value configuration overrides (e.g. maintenance flags, registration toggles). |

---

## 3. Relational Architecture & Foreign Keys

```
┌──────────────┐          1:N           ┌──────────────┐
│     User     ├───────────────────────►│GameCharacter │
└──────┬───────┘                        └──────────────┘
       │ 1:N
       ├───────────────────────────────►┌──────────────┐
       │                                │    Thread    │
       │                                └──────┬───────┘
       │                                       │ 1:N
       │                                       ▼
       │                                ┌──────────────┐
       └───────────────────────────────►│    Reply     │
                                        └──────────────┘
```

- **Cascading Deletions:** Deleting a `User` cascades to delete associated sessions, forum replies, and profile customization assets (`onDelete: Cascade`).
- **JSON Column Strategy:** High-complexity composite states (such as `WorldMap.gridData` or `GameCharacter.stateData`) are stored as validated JSON strings to maximize MariaDB/MySQL read/write throughput.

---

## 4. Schema Synchronization & Migration Workflow

Execute database maintenance commands via npm:

```bash
# Push schema updates directly to local MariaDB/MySQL DB during development
npx prisma db push

# Create and apply migration files for production MariaDB
npx prisma migrate dev --name init_schema

# Regenerate Prisma Client TypeScript type definitions
npx prisma generate

# Open visual database browser
npx prisma studio
```
