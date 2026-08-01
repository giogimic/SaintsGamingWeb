# Upload Storage

**Code:** `src/web/lib/upload.ts` (+ `s3-storage.ts`)  
**Rule:** all upload API routes / server actions must call this module — never write disk or S3 elsewhere.

---

## Default (local)

Unset S3 env → files land in `public/uploads` (or `UPLOAD_DIR`) and URLs look like `/uploads/<ts>-<hash>.ext`.

Served by Next static files / Docker volume `./uploads` → `/app/public/uploads`.

---

## Optional S3 / CDN

Enabled only when **all** of these are set:

| Var | Purpose |
| :--- | :--- |
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credentials |
| `CDN_BASE_URL` | Public base URL (no trailing slash) |

Optional: `S3_REGION`, `S3_ENDPOINT` (MinIO/R2), `S3_FORCE_PATH_STYLE=true` (MinIO).

Behavior:
1. Validate MIME / size / magic bytes (unchanged)
2. `PutObject` to key `uploads/<filename>`
3. Return `${CDN_BASE_URL}/uploads/<filename>`
4. On S3 failure → **fall back to local disk** (logged)

`deleteUploadedFile` removes the S3 object when CDN/S3 is configured, and still unlinks local `/uploads/...` paths when present.

`next.config.ts` adds the CDN hostname to `images.remotePatterns` at build time when `CDN_BASE_URL` / `NEXT_PUBLIC_CDN_BASE_URL` is set.

---

## Callers (do not bypass)

- `POST /api/upload`, `/api/upload/avatar`, `/api/upload/forum`, `/api/upload/social`
- UCP profile gallery server actions

---

## Legacy local → bucket migrate

After enabling S3, copy existing disk files (keys stay `uploads/<filename>` so CDN can serve the same path shape as `/uploads/...`):

```bash
npx tsx scripts/migrate-local-uploads-to-s3.ts --dry-run
npx tsx scripts/migrate-local-uploads-to-s3.ts --skip-existing
```

This does **not** rewrite DB rows. Relative `/uploads/...` URLs keep working if the CDN (or reverse proxy) fronts that prefix to the bucket.
