# REST API & Webhook Reference

This document details the core RESTful API routes, authentication handlers, Studio map persistence endpoints, and cluster synchronization webhooks in Saints Gaming.

---

## 1. Authentication Endpoints

Saints Gaming uses **Auth.js (NextAuth.js)** supporting credentials and Discord OAuth:

| Endpoint | Method | Description | Payload / Response |
| :--- | :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | `GET/POST` | NextAuth core handler for session validation, Discord OAuth callback, and token issuance. | Standard OAuth 2.0 / JWT session cookie. |
| `/api/auth/register` | `POST` | Creates a new user account with hashed password (`bcrypt`). | `{ username, email, password }` $\to$ `201 Created` |

---

## 2. World Maps & Loot APIs

Endpoints used by World Studio and the MMO runtime to fetch and persist definitions:

### `GET /api/maps`
- **Query Params:** `?id={mapId}` (e.g. `saints_village`) or empty to list all map metadata headers.
- **Response:** `200 OK` with serialized `WorldMap` payload (`gridData`, `tileLayersData`, `entitiesData`).

### `POST /api/maps`
- **Authentication:** Requires `ADMIN` or `BUILDER` session role.
- **Payload:** Full `WorldMap` JSON object. Validates layers before saving to database.
- **Response:** `200 OK` with `{ success: true, version: number }`.

### `GET /api/loot/tables` & `POST /api/loot/tables`
- **Usage:** Reads or updates weighted loot drop tables used by overworld monsters and chests.

---

## 3. Internal Cluster Sync Webhooks

Used by the Next.js server to notify the Go MMO backend (`:3001`) of real-time administrative updates:

```http
POST /api/internal/sync-map
Host: localhost:3001
Content-Type: application/json
X-Cluster-Secret: <CLUSTER_SECRET>

{
  "mapId": "saints_village",
  "version": 4,
  "timestamp": 1724458800000
}
```

> [!IMPORTANT]
> The `/api/internal/*` webhook endpoints reject any incoming requests lacking the shared cluster secret header or originating from non-loopback IP addresses.

---

## 4. Community & Content Endpoints

- **`GET /api/forum/threads`**: Fetches paginated forum discussion threads by category or hashtag.
- **`POST /api/forum/threads`**: Submits a new forum thread (rate limited: 1 thread per 30 seconds).
- **`GET /api/news`**: Fetches published news articles and patch notes for the home feed.
- **`GET /api/modpacks`**: Lists active downloadable game modpacks with direct download URLs.

### Standard Error Response Format
```json
{
  "error": "UNAUTHORIZED",
  "message": "You must be signed in to perform this action.",
  "statusCode": 401
}
```
