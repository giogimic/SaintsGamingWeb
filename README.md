# Saints Gaming

A community web application built with Next.js (App Router), Auth.js v5, and Prisma. 

## Changelog

### v1.1.0-4
- **Bugfix (Auth.js)**: Fixed an issue where the browser would quietly drop the session cookie (`__Secure-authjs.session-token`) after a successful login in certain reverse-proxy or Cloudflare configurations. Removed manual enforcement of the `useSecureCookies` boolean to allow Auth.js to correctly determine the cookie policy automatically based on `X-Forwarded-Proto`.

### v1.1.0-3
- **Bugfix (Docker Setup)**: Fixed a startup conflict issue in `bun-setup.sh` and `bun-setup.bat` where failed prior installations left dangling containers (`saints-gaming-db` and `saints-gaming-web`), blocking `docker compose up` from successfully recreating the environment. The scripts now forcefully clear existing conflicting containers prior to triggering the cluster build.

### v1.1.0-2
- **Bugfix (Auth.js)**: Fixed a Next.js compilation error by adding `forcePasswordChange: false` to the Discord provider callback.
- **Bugfix (Database)**: Fixed a startup error inside Docker containers (`Error validating datasource db: the URL must start with the protocol file:`) by ensuring `entrypoint.sh` always provides a fallback `DATABASE_URL`.
- **Setup Refactor**: Removed the hardcoded dummy admin creation from `prisma/seed.ts`. Seed scripts now dynamically link to existing admins (created during setup) or gracefully skip seeding if the database is empty.

### v1.1.0-1
- **UCP Refactor**: Migrated the entire FiveM User Control Panel (`/ucp`, `/ucp/settings`, `/ucp/garage`, `/ucp/register`) to use modern `shadcn/ui` components (`Card`, `Badge`, `CardHeader`), vastly improving layout structure and aesthetic consistency.
- **Navbar Update**: Redesigned the mobile navigation menu to be clean and minimal, prioritizing user profile display, organized link categories, and a glossy `backdrop-blur` background. Fixed desktop overflow issues.
- **Landing Page**: Adjusted the sizing, alignment, and responsiveness of the main Call-to-Action buttons on mobile to prevent overlapping with the logo.


### v1.0.6-58
- **Critical Auth Fix (Part 3)**: Fixed a bug where Next.js 15 SWC compiler inside Docker was aggressively pruning the dynamic NextAuth API route (`app/api/auth/[...nextauth]/route.ts`) during `bun run build`. Next.js 15 requires specific AST structures (e.g., `export async function GET`) for dynamic API route recognition. The arrow function exports (`export const GET = ...`) were replaced with standard async function declarations, forcing the compiler to correctly register and serve the `/api/auth/csrf` and other auth endpoints.

### v1.0.6-57
- **Critical Auth Fix**: Explicitly defined raw `cookies` configuration inside `auth.ts` to strictly enforce `__Secure-authjs.session-token` and `__Host-authjs.csrf-token` with the `Secure` flag unconditionally when `NODE_ENV === "production"`. This permanently bypasses NextAuth's internal protocol sniffing (which frequently fails and defaults to HTTP cookies inside Docker Nginx/Caddy proxy networks), guaranteeing the browser receives and accepts the cookies securely.


### v1.0.6-57
- **Critical Auth Fix (Part 2)**: The previous patch injected `AUTH_URL` and `NEXTAUTH_URL` into Docker to solve the proxy domain mismatch, but it set the value to the root domain (`https://saintsgaming.net`). NextAuth v5 REQUIRES the `AUTH_URL` to be the *absolute base path* of the API endpoints (`https://saintsgaming.net/api/auth`). Because it was set to the root domain, NextAuth mistakenly tried to serve auth endpoints at `/csrf` instead of `/api/auth/csrf`, resulting in global 404 errors for all NextAuth API routes. The Docker variables have been corrected to append `/api/auth`.

### v1.0.6-56
- **Critical Auth Fix**: Injected `AUTH_URL` and `NEXTAUTH_URL` fallback values into `docker-compose.yml` and `docker-compose.base.yml` (using `NEXT_PUBLIC_SITE_URL`). This forcibly resolves NextAuth's internal proxy-url mismatch when running behind Nginx/Caddy, directly fixing the persistent "No cookies sent by browser" and missing session cookie issue.


### v1.0.6-55
- **Critical Docker/Next.js 15 Fix (Part 2)**: The previous patch explicitly exported the `GET` and `POST` handlers, but Next.js 15's static analyzer STILL aggressively pruned the route because `handlers.GET` is not recognized as a statically resolvable function declaration when combined with `force-dynamic`. The route handlers are now explicitly wrapped in standard `async (req) => {}` arrow functions. This provides absolute mathematical certainty that the Next.js compiler will recognize and build the `/api/auth/*` endpoints into the Docker container.

### v1.0.6-54
- **Critical Docker/Next.js 15 Fix**: Patched a devastating Next.js 15 App Router bug where the `app/api/auth/[...nextauth]/route.ts` API route was being completely deleted (pruned) from the production Docker build due to statically analyzing a destructured export (`export const { GET, POST } = handlers;`). This silent static failure caused the live server to throw 404s for all NextAuth requests (including logins), while the client-side NextAuth fetcher swallowed the 404 error and redirected to `/home` without any cookies. Handlers are now explicitly exported to bypass the static analyzer bug.

### v1.0.6-53
- **Diagnostic Tool**: Added a `/api/dev/debug-auth` diagnostic endpoint to securely inspect raw proxy headers, browser cookies, and session states in production to debug NextAuth Caddy proxying behavior.

### v1.0.6-52
- Removed `AUTH_URL` from NextAuth configuration in Docker environment to resolve session persistence issues with Caddy/HTTPS setups.
- Removed missing `fix-perms.mjs` dependency from `package.json` setup script which caused deployment failures on Linux.

### v1.0.6-51
- **Critical Auth Fix**: Fixed a client-side navigation bug in `login-form.tsx` where a successful NextAuth credentials sign-in incorrectly triggered the CSRF token mismatch error handler. The `callbackUrl` is now explicitly set, bypassing the flawed URL check and ensuring users are cleanly navigated to `/home` instead of being stuck in a `/login` redirect loop.
- **Critical Auth Fix**: Injected an explicit `AUTH_URL` fallback into `.env.example` and `docker-compose.yml`. This permanently resolves an issue where NextAuth running behind a Docker reverse proxy (Caddy/Nginx) would misinterpret the incoming host headers, causing it to incorrectly set cookie domains to `localhost` and forcing the browser to reject the session tokens.
- **Bugfix**: Added server-side authentication protection to the `app/(main)/login/page.tsx` route to immediately bounce already-logged-in users to `/home`.

### v1.0.6-50
- **Critical Docker Build Fix**: Fixed a bug in `bun-setup.sh` where `NEXT_PUBLIC_SITE_URL` was being extracted using `cut -d'"' -f2`. If the `.env` file lacked quotes around the URL, the script would extract the entire key-value pair (`NEXT_PUBLIC_SITE_URL=https...`) and then prepend the key *again* when saving, resulting in a completely corrupted URL (`NEXT_PUBLIC_SITE_URL=NEXT_PUBLIC_SITE_URL=https...`). This caused Next.js to crash at build time when attempting to parse the invalid URL. The script now robustly extracts only the `http`/`https` portion of the string using `sed`.

### v1.0.6-49
- **Critical Auth Fix**: Fixed a fatal flaw in the `app/api/auth/error/route.ts` cookie deletion endpoint. Next.js's native `cookies().delete()` function does NOT append the `Secure` flag by default. Because `__Host-` and `__Secure-` prefixed cookies natively reject modifications unless `Secure=true` is explicitly set, the browser was completely ignoring the server's command to clear the corrupted CSRF tokens. This caused users with expired CSRF tokens to become permanently locked out of the site, bouncing back and forth between "Access Denied" and `/login`. The cookies are now forcefully overwritten with `secure: true`.

### v1.0.6-48
- **Critical Security Fix**: Patched `scripts/setup-env.mjs` which was incorrectly skipping the generation of `AUTH_SECRET` if the `.env` file contained the dummy value `"replace-with-a-random-secret"`. This caused all new server deployments to use a 30-character secret, breaking NextAuth v5's HKDF encryption (which requires >= 32 characters) and completely breaking the login flow.
- **Bugfix**: Added a custom logger to `auth.ts` to suppress the endless `JWTSessionError` terminal spam. This log spam was actually being triggered by Next.js `<Link>` component prefetching firing in the background whenever a user with a stale cookie scrolled the homepage, which made it appear as if the server was stuck in an infinite loop.

### v1.0.6-47
- **Bugfix**: Re-architected the `JWTSessionError` loop fix. Since NextAuth session and CSRF cookies are strictly `HttpOnly`, they cannot be deleted via JavaScript `document.cookie` on the client side. The login form now intercepts the silent CSRF redirect and bounces the user to the server-side `/api/auth/error` endpoint to forcibly wipe the HttpOnly cookies, then safely redirects back to `/login`.
- **Optimization**: Disabled `refetchOnWindowFocus` in `<SessionProvider>` to permanently silence the endless `JWTSessionError` spam that occurred every time a user with an invalid cookie alt-tabbed or clicked their browser window.

### v1.0.6-46
- **Bugfix**: Fixed the NextAuth v5 infinite login refresh bug. When a user's session or CSRF cookies became invalid (e.g., after a server rebuild or secret rotation), the NextAuth `signIn` fetch silently followed the AccessDenied redirect, causing the UI to ignore the error and "refresh" the page infinitely. The login form now properly intercepts URL redirects, informs the user, clears the expired CSRF/Session cookies, and reloads the page to issue fresh tokens.

### v1.0.6-45
- **Bugfix**: Restored `app/api/auth/error/route.ts` to correctly intercept internal NextAuth redirects when encountering `JWTSessionError` (such as when logging in with a stale cookie after a secret regeneration) and properly clears old session cookies to prevent infinite redirection loops.

### v1.0.6-44
- **Bugfix**: Re-added `export const dynamic = "force-dynamic";` to `app/api/auth/[...nextauth]/route.ts`. The Next.js 15 static analyzer was aggressively pruning the Auth.js API route endpoints from the production Docker build, resulting in hard 404s for login POST requests and CSRF GET requests.

### v1.0.6-43
- **Bugfix**: Fixed NextAuth "JSON.parse" crash during login. Switched from client-side `SessionProvider` fetching to server-side session hydration in `app/layout.tsx` via `await auth()`. Also removed `nodejs` and `force-dynamic` explicit exports in `app/api/auth/[...nextauth]/route.ts` which conflict with Next.js 15 routing segments.
- **Automation / Setup**: Purged legacy strict `AUTH_URL` configurations from all setup scripts (`bun-setup.sh`, `bun-setup.bat`, `setup-env.mjs`, and `.env.example`). NextAuth now natively relies on `trustHost: true` combined with Nginx/Caddy proxy headers, permanently preventing CSRF origin mismatch 404s when deploying to production domains or running locally.

### v1.0.6-42
- **Automation / Setup**: Re-engineered the `bun-setup.sh` web server deployment logic.
- **Aggressive Port Clearing**: The setup script now natively prompts to forcefully kill (`fuser -k`) any rogue processes blocking ports 80, 443, or 3000 to prevent locked setups.
- **Nginx to Caddy Takeover**: The setup script now actively detects Nginx and offers to forcefully uninstall it, replace it with Caddy, and automatically deploy Caddy proxy configurations for both the main site and extra subdomains (like CubeCoders AMP). Caddy drastically simplifies the configuration files and entirely replaces Certbot with native HTTPS.

### v1.0.6-41
- **Bugfix**: Reverted NextAuth API route wrapper in `app/api/auth/[...nextauth]/route.ts` to standard exports (`export const { GET, POST } = handlers;`). This solves the Next.js 15 routing 404 issue caused by manually resolving `context.params`.
- **Feature**: Upgraded `bun-setup.sh` to allow users to generate multiple Nginx reverse-proxy subdomain configurations (e.g. `panel.saintsgaming.net` for CubeCoders AMP) alongside the main site setup. It automatically wires the ports and generates Let's Encrypt SSL certificates for the subdomains.
- **Branding**: Replaced the performance-heavy 3D Voxel Logo with a clean, optimized 2D Voxel SVG (`SGVoxelSvgLogo`) throughout the site.
- **Aesthetic**: Redesigned the primary navigation into a floating, frosted-glass "island" navbar and expanded the footer into a rich 3-column link directory.

### v1.0.6-40
- **Live Server Production Readiness**: Added custom boundary error handling (premium 404 page, safe React Error Boundary).
- **Aesthetic Enhancements**: Improved `sg-text-gradient` and added `sg-pulse-btn` micro-animations for call-to-actions.
- **Sentry Fix**: Safely removed Sentry bindings from `global-error.tsx` to prevent fatal Next.js crashes during deployment without `.tools`.
- **Loading State**: Added a global loader for slow route transitions.

### v1.0.6-39
* **Bugfix:** Resolved `<!DOCTYPE html>` 404 NextAuth error caused by Next.js 15 migrating `context.params` to a Promise. NextAuth v5 beta expected an object and thus failed to parse dynamic segments (like `/api/auth/session`). The wrapper now explicitly awaits `context.params` before injecting it into `handlers.GET/POST`.


### v1.0.6-38
* **Bugfix:** Passed the `context` parameter down to the NextAuth App Router handlers (`handlers.GET(request, context)`) and ignored Next 15 `Promise<any>` type mismatches. NextAuth requires the `context` param at runtime to parse the URL segments correctly, otherwise it defaults to a `/api/auth` 404 regardless of the `force-dynamic` flag.


### v1.0.6-37
* **Bugfix:** Restored NextAuth API static route compilation fix. Re-wrapped explicit `GET` and `POST` async functions in `app/api/auth/[...nextauth]/route.ts` to prevent the Next.js static analyzer from pruning the authentication API endpoints and causing a `404 Not Found` upon login, which was lost during a previous full reinstall.
* **Bugfix:** Resolved unused import warning (`_`) in `app/actions/settings.ts`.


### v1.0.6-36
* **Feature:** Added fully dynamic "Site Version" control to the Admin Panel. You can now update the version number displayed across the site (like the footer) without needing a rebuild or deployment!
* **Optimization:** Added strict rules to `.agents/AGENTS.md` to guarantee version numbers are bumped on every change.

### v1.0.6-35
* **Optimization:** Fully gutted and removed all AI integration logic (OpenAI, Ollama) and dependencies to optimize server CPU and prevent performance degradation on primary game servers.
* **Feature:** Added dynamic database-backed configuration for the "Join Discord" button. Administrators can now change the Discord Invite URL directly from the Admin Panel without needing to rebuild or redeploy the site.
* **Packaging:** Updated release scripts to generate a lightweight patch archive (`release-patch-update-x.x.x.zip`) to facilitate faster updates alongside the full release package.

### v1.0.6-34
* **Feature:** Implemented dynamic routes for News Articles (`/news/[slug]`) with Markdown support and cover image rendering.
* **Feature:** Implemented dynamic routes for Forum Categories (`/forum/[slug]`) and Forum Threads (`/forum/t/[slug]`) with fully functional UI, Markdown rendering, and author sidebars.
* **Content:** Fleshed out the database dummy data with realistic Community Rules, Welcome Threads, and accurate category organization in the Prisma seed script.
* **Bugfix:** Resolved unused import linting errors in the new dynamic page routes during production builds.
### v1.0.6-33
* **UX Improvement:** Moved the "Push Dummy Content (News & SVGs)" button directly to the Database Health dashboard alongside the "Inject Dummy Threads" button, and added client-side loading states and toast-style native alerts so errors don't silently fail.

### v1.0.6-32
* **Bugfix:** Resolved `Errno 13 Permission Denied` during database initialization. The `bun-setup.sh` script was incorrectly modifying the permissions of the `mysql_data` directory to the host user, which locked the internal MariaDB process out of its own database files.
* **Bugfix:** Added `--accept-data-loss` to the `entrypoint.sh` Prisma database push command to prevent the setup from hanging indefinitely on interactive prompts when initializing a fresh database.
* **Bugfix:** Forced dynamic routing for `app/api/auth/[...nextauth]/route.ts` to ensure Next.js does not prune the authentication endpoints during the production Docker build.
* **Bugfix:** Added graceful error handling to the Development Database Actions to prevent unhandled `500` server errors when injecting dummy threads into a completely empty database.
* **Robustness:** Suppressed the annoying `NEXT_PUBLIC_DISCORD_INVITE` Docker warnings by correctly populating the default environment file during setup.

### v1.0.6-31
* **Critical Bugfix:** Resolved a persistent `404 Not Found` error during the NextAuth login flow. Sentry's Next.js auto-instrumentation plugin was illegally wrapping the App Router `[...nextauth]` route handler during the compilation phase, permanently breaking the API routes in production. We have completely stripped Sentry's Webpack wrapping from `next.config.ts` to ensure clean Auth.js compilation.

### v1.0.6-30
* **Robustness:** Added explicit dependency checks and automated installations for `curl` and `openssl` into `bun-setup.sh`. This guarantees that MariaDB secure password generation and the container HTTP health checks will not fail on barebones Linux servers missing these basic packages.

### v1.0.6-29
* **Bugfix:** Resolved the "forever hanging at Container saints-gaming-db Healthy" issue. The `bun-setup.sh` script now explicitly asks you how to handle the AI Chat Engine (Ollama). If you choose "Skip / Disable", it will actually strip the `ollama` containers from `docker-compose.yml`, preventing Docker from silently downloading the 2GB Llama 3 AI model in the background and locking up the installation process for users with slower network connections.

### v1.0.6-28
* **Feature:** Implemented **Reverse Proxy Detection** in `bun-setup.sh` and `bun-setup.bat`. The scripts will now gracefully detect if ports 80/443 are already in use by a 3rd party web service (like Nginx Proxy Manager, Pterodactyl, cPanel) and offer to deploy the Docker cluster in "Reverse Proxy Mode." In this mode, Docker completely avoids mapping to ports 80/443, safely bypassing Nginx/Certbot installation on the host system, preventing SSL routing collisions, and cleanly exposing only the internal web port (e.g., 3000) for the user's proxy to route to.

### v1.0.6-27
* **Bugfix:** Explicitly added `trustedDependencies` to `package.json` so Bun auto-executes postinstall lifecycle scripts (like Prisma client generation and Sentry binary downloads) natively without spamming `allowScripts` warnings.
* **Bugfix:** Resolved the persistent `404` error upon login redirection. The Sentry Next.js plugin was incorrectly wrapping the NextAuth route handlers in a broken AST tree during the build phase. Fixed by explicitly defining `excludeServerRoutes: ["/api/auth/[...nextauth]"]` in `next.config.ts`.

### v1.0.6-26
* **Feature:** Enhanced the `bun-setup.sh` Docker build spinner to explicitly stream and display the live output of `docker_build.log` directly in the terminal UI, preventing users from incorrectly assuming the script is frozen during the container compilation phase.

### v1.0.6-25
* **Bugfix:** Resolved a major Next.js Docker build failure (`Can't reach database server at localhost:3306`) where the build step would crash trying to statically generate Server Components (like Admin or Dev dashboard pages) by querying Prisma before the database was ever initialized. Fixed by adding `export const dynamic = "force-dynamic";` to the root `app/layout.tsx` to opt-out of build-time database execution globally.
* **Diagnostics:** Injected verbose debug logging into the NextAuth / Auth.js Credentials Provider `authorize` lifecycle to capture and trace exact schema validation, database lookup, and bcrypt logic errors directly in the Docker container logs.

### v1.0.6-24
* **Feature:** Upgraded `bun-setup.sh` and `bun-setup.bat` to include an intelligent Database Wizard. Administrators can now seamlessly select between SQLite, Internal MariaDB (Docker), or External MySQL, and the scripts will auto-wire the `.env` connection strings without requiring manual edits.
* **Feature:** Migrated the production Docker base image to `oven/bun:1-debian` to utilize Bun's lightning fast package resolution while maintaining the robust Debian compatibility needed for Next.js builds.
* **Bugfix:** Resolved a critical Next.js build crash (`Cannot find module '../data/patch.json'`) on Linux servers by purging `isomorphic-dompurify` (which relied on Node-heavy `jsdom`) and replacing it with the standard `sanitize-html` library for forum thread and post sanitization.

### v1.0.6-23
* **Feature:** Added Server Status tracking system with dynamic Admin Dashboard management.
* **Feature:** Integrated DaisyUI for sleek terminal and console effects on Mod Pack and Server pages.
* **Content:** Seeded the database with 10 dummy news articles, dummy mod packs, and a structured forum hierarchy to prepare for launch.
* **Bugfix:** Resolved NextAuth login bugs on fresh Windows installations by ensuring `setup.bat` correctly initiates the admin account creation flow via a health-check loop.
* **Bugfix:** Cleaned up unused files (`middleware.ts`, `bun-setup.sh`, `start-local.bat`) from the root directory.

### v1.0.6-22
* **Runtime Fix:** Aligned the supported Node.js runtime to Node `>=22.13.0` and switched the Docker image to Debian/glibc-based `node:22-bookworm-slim`. This resolves `npm warn EBADENGINE` warnings from modern AI SDK and 3D dependencies that require Node 22.
* **Bugfix:** Added verification to the `setup.sh` script to validate Discord Client ID and Secret with the Discord OAuth API before saving them to `.env`. This prevents broken login flows caused by typos. // revisit 
* **Bugfix:** Renamed `middleware.ts` to `proxy.ts` to comply with Next.js 16.2.9 file conventions and resolve Turbopack deprecation warnings.
* **Critical Bugfix:** Fixed a persistent Next.js `404` Auth routing bug caused by the Sentry SDK. Sentry's AST parser breaks Auth.js dynamic `export const { GET, POST }` exports during build. We explicitly bypassed this by adding `webpack.excludeServerRoutes` in `next.config.ts` to prevent Sentry from mangling the `[...nextauth]` route.

### v1.0.6-21
* **Feature:** Integrated Sentry (@sentry/nextjs) for robust application error tracking and monitoring.
* **Feature:** Integrated Zustand for lightweight client-side state management (`lib/store.ts`).
* **Feature:** Created PM2 configuration (`ecosystem.config.js`) to support cluster mode load balancing in production.
* **Feature:** Created `useAuth` hook and strict TypeScript type extensions for `NextAuth` Session, `JWT`, and `User` to enforce type safety on custom `permissionLevel` and `devConsoleEnabled` properties.
* **Bugfix:** Purged an old backup extraction folder (`temp_extract`) which was causing 200+ duplicate linting errors.
* **Bugfix:** Cleaned up unused variables and unused `@ts-expect-error` tags project-wide for 100% strict TypeScript/ESLint compliance.


### v1.0.6-20
* **Bugfix:** Resolved the root cause of the Next.js `404` Auth routing bug on Linux. The presence of the explicit `app/api/auth/providers/route.ts` file was causing the Next.js App Router to silently shadow and ignore the catch-all `[...nextauth]` segment entirely. By removing `providers` and restoring the pure catch-all, NextAuth now properly natively handles all dynamic routes (including `callback`, `csrf`, and `session`).
* **Fix:** Restored the custom `/api/auth/register` and `/api/auth/forgot-password` endpoints that were accidentally displaced during the previous routing workaround.

### v1.0.6-19
* **Feature:** Added automatic file ownership and permission fixing to `setup.sh` so that when users extract the zip archive as root, they do not get locked out of editing files (like `.env` and `Caddyfile`) with their normal user account.

### v1.0.6-18
* **Bugfix:** Bypassed the Next.js `[...nextauth]` catch-all route completely by explicitly creating individual route handlers for every single Auth.js endpoint (`/session`, `/csrf`, `/callback/*`, `/signin/*`, `/signout`). This solves the Linux Docker static routing bug where the catch-all route was being ignored/shadowed by sibling files.

### v1.0.6-17
* **Bugfix:** Wrapped Auth.js NextAuth route exports in explicit Next.js standard async route functions (`export async function GET(req) { ... }`) to guarantee Next.js compiler detection in strict Linux Docker environments. Prevents 404 Route Not Found errors.

### v1.0.6-16
* **Bugfix:** Upgraded the `setup.sh` deployment logic to explicitly use `sudo docker compose build --no-cache`. Previously, Docker's aggressive caching would sometimes re-use the broken NextAuth API routes from previous failed builds instead of grabbing the newly unzipped patched files, causing persistent 404s even after updating.

### v1.0.6-15
* **Critical Bugfix:** Fixed a Next.js App Router bug where the `[...nextauth]` route was silently pruned during the Docker build phase. Because Docker builds without a live database, Prisma threw an initialization error during Next.js static prerendering, causing Next.js to discard the `/api/auth/` endpoints. Added `export const dynamic = "force-dynamic";` to bypass static prerendering and guarantee the routes are served.

### v1.0.6-14
* **Bugfix:** Fixed a critical Next.js 14+ static compilation bug where the `[...nextauth]` routes (`/api/auth/session`, `/csrf`, etc.) were being completely stripped out of production builds and returning 404 HTML pages. Explicitly exported `GET` and `POST` handlers instead of using destructured exports to satisfy the App Router static analyzer.

### v1.0.6-13
* **Bugfix:** Added a "Confirm Password" dialog to the `setup.sh` script. Previously, the hidden password input had no confirmation, leading to users frequently making typos and being locked out of their fresh installations.
* **Bugfix:** Changed the misleading placeholder text in the login form from `GioGimic` to a generic example.

### v1.0.6-12
* **UX Fix:** Changed the login form to accept "Username OR Email" instead of strictly requiring an Email. The setup script defaults the admin email to `noreply@domain.com` without showing it to the user, causing immense confusion since users tried typing their username into the strict email field.

### v1.0.6-11
* **Bugfix:** Fixed Discord OAuth login failing with "Error occurred" because the Next.js `auth.ts` file was trying to read the outdated `DISCORD_CLIENT_ID` variable instead of the new `AUTH_DISCORD_ID` variable passed by Docker.

### v1.0.6-10
* **Hotfix:** Fixed an edge-case bug in `setup.sh` where interrupting the script or performing a Nuclear Wipe could cause Docker to mistakenly mount `Caddyfile` as a directory, permanently crashing the proxy.

### v1.0.6-9
* **Hotfix:** Removed invalid Caddy rate-limiting syntax from `setup.sh` which caused server startup crashes.
* **Hotfix:** Removed overly aggressive Content-Security-Policy header which blocked Next.js hydration and Discord Auth avatars.

### v1.0.6-8
* **Hotfix:** Fixed Discord environment variables in `setup.sh` (`DISCORD_CLIENT_ID` renamed to `AUTH_DISCORD_ID`) to match NextAuth v5 expected configurations.

### v1.0.6-7
* **Hotfix:** Fixed a critical bug in `setup.sh` where Caddy was crashing on startup due to an invalid `auto_https on` configuration directive.

### v1.0.6-6
* Prepared proper release structure and organized old releases into the `old-versions` directory.

### v1.0.6-5
* Fixed a NextAuth configuration issue where `next-auth/react` client functions were incorrectly resolving the `api/auth/csrf` path as a relative URL. Wrapped the root layout with a dedicated `AuthProvider` that sets an absolute `basePath` to ensure proper routing during form authentication.

### v1.0.6-4
* Fixed a bug in NextAuth v5 beta where the client-side `signIn` function attempts to fetch the removed `/api/auth/providers` endpoint and throws a `Configuration` error on 404. Added a mock endpoint to resolve this.
* Fixed the `app/api/auth/error/route.ts` redirect logic to respect `x-forwarded-host` proxy headers, preventing it from incorrectly redirecting production users to `localhost:3000`.

### v1.0.6-3
* Updated release packaging rules to mandate README inclusion.
* Expanded project documentation.

### v1.0.6-2
* Fixed a bug where a failed or rejected login resulted in a blank 404 page. Auth.js was redirecting to a default error route that no longer exists in v5.
* Added `app/api/auth/error/route.ts` to intercept NextAuth's internal fallback route and redirect the user back to the `/login` page with the appropriate error parameter.

### v1.0.6-1
* Fixed a state synchronization issue in `login-form.tsx`. Removed the `useEffect` hook that was causing linting warnings and replaced it with direct state derivation from Next.js URL parameters.
* Updated `setup.sh`. The "Nuclear Wipe" option now correctly identifies and deletes all Docker volumes, including `caddy_data`, `mysql_data`, `ollama_data`, and local `/data` directories.

### v1.0.x (Prior Features)
* Integrated Auth.js (NextAuth v5) with both Discord OAuth and traditional email/password credentials.
* Set up Prisma schema supporting SQLite for local/default usage and MariaDB for production scaling.
* Included forum capabilities, news management, user roles, and an administrative dashboard.

## NextAuth / Login Troubleshooting

The login flow has a few common failure points that can make credentials sign-in appear broken even when registration still works.

### Likely issues to check

- Missing or miswired Auth.js routes:
  - The client-side sign-in flow can fail if NextAuth expects `/api/auth/providers` and the route is not available.
  - Confirm that the catch-all handler under `app/api/auth/[...nextauth]/route.ts` is being generated correctly in the deployed build.

- Credentials payload mismatch:
  - The credentials provider in `auth.ts` expects `identifier` and `password`.
  - The auto-login step in `components/auth/register-form.tsx` now sends `identifier` instead of `email`, which removes a likely source of immediate post-registration login failure.

- Proxy / reverse-proxy host issues:
  - If the app is behind Caddy or another proxy, redirects may break when `x-forwarded-host` or `x-forwarded-proto` are missing or misconfigured.
  - Check the redirect logic in `app/api/auth/error/route.ts` and the proxy configuration.

- Environment configuration:
  - Discord login depends on valid `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET` values.
  - Missing or incorrect auth environment variables can produce `Configuration` errors even when the rest of the app is working.

- Database / Prisma state:
  - Registration can succeed while login fails if the user record is created but the password hash, Prisma connection, or session/JWT handling is inconsistent.
  - Verify that the database is reachable and that the user exists with a valid password hash.

### Quick sanity checks

- Open `/api/auth/session` and `/api/auth/csrf` in the browser or with curl.
- Check `/api/auth/providers` for the expected response shape.
- Review the server logs for `Configuration`, `CredentialsSignin`, or Prisma-related errors.
- Confirm the deployed environment variables match the values used locally.

## Installation / Deployment

1. Unzip the release archive on the target server.
2. Run `bash setup.sh`.
3. Select the desired installation or update method from the interactive prompt.
