# Forum text enhancement

**Admin UI:** `/admin/forum/settings`  
**Editor buttons:** Grammar Check / Polish in `markdown-editor.tsx`  
**APIs:** `POST /api/ai/enhance`, `GET /api/ai/config`, `GET|POST /api/ai/local`

---

## Providers

| Provider | Requirements |
| :--- | :--- |
| **Gemini (cloud)** | `GEMINI_API_KEY` env; model `gemini-2.5-flash` |
| **Ollama (local)** | [Ollama](https://ollama.com) running on the host; pull a catalog model from Forum Settings |
| **Off** | Buttons hidden |

SiteSetting keys: `forum_ai_enabled`, `forum_ai_provider`, `forum_ai_ollama_url`, `forum_ai_ollama_model`.

---

## Local models

Curated list in `src/web/lib/forum-ai-settings.ts` with approximate **RAM when loaded** and **download size**.  
Download/install uses `POST /api/ai/local` `{ action: "pull", modelId }` (Developer+).  
Ollama must be reachable at the configured base URL (default `http://127.0.0.1:11434`).

---

## Permissions

| Action | Level |
| :--- | :--- |
| View Forum Settings | Head Moderator+ |
| Save provider / download models | Developer+ |
| Use enhance buttons | Any authenticated user (when enabled) |
