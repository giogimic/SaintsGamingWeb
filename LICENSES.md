# Project Licenses

The Saints Gaming Web project relies on various open-source dependencies, frameworks, and tools. Below is an overview of the major components and their respective licenses.

## 1. Primary Frameworks & Engines

| Component | License | Notes |
| :--- | :--- | :--- |
| **Next.js** | MIT | React framework used for the main application structure and API routes. |
| **React** | MIT | Core library for building user interfaces. |
| **Babylon.js** (`@babylonjs/core`, etc.) | Apache-2.0 | Core 3D engine used for the game client rendering. |
| **Prisma** (`@prisma/client`, `prisma`) | Apache-2.0 | Next-generation Node.js and TypeScript ORM for database connectivity. |
| **TailwindCSS** | MIT | Utility-first CSS framework for rapid UI development. |
| **Electron** (in `saints-app`) | MIT | Used for building the cross-platform desktop client. |
| **Go** (in `the-lobby`) | BSD-3-Clause | Language used for the MMO backend server. |

## 2. Core Dependencies & Libraries

Most runtime packages used by this project are distributed under the **MIT** license. This includes:

- **State Management & Data Fetching:** `zustand`, `swr`, `immer`
- **UI Components & Styling:** `lucide-react`, `framer-motion`, `@radix-ui/*`, `clsx`, `tailwind-merge`
- **Networking & WebSockets:** `socket.io`, `socket.io-client`, `@socket.io/redis-adapter`
- **Utilities:** `zod`, `date-fns`, `js-yaml`, `jszip`, `pako`
- **Auth & Services:** `next-auth`, `bcryptjs`, `@aws-sdk/client-s3`, `@google/genai`, `resend`

For a complete and authoritative list of package licenses, refer to the `node_modules` directory and the `package.json` configurations. You can run `npx license-checker --summary` locally to generate an exhaustive manifest.

## 3. Third-Party Software & SDKs

- **FFmpeg (`ffmpeg-static`):** GNU GPL (with some parts LGPL). Distributed as a pre-compiled static binary.
- **Redis:** Redis Source Available License (RSALv2) / Server Side Public License (SSPLv1). Used for pub/sub and caching.
- **MySQL / SQLite:** GPLv2 / Public Domain. Used for relational database storage.
- **FBX2glTF (`fbx2gltf`):** MIT. Used for asset pipeline conversion of 3D models.

## 4. Attribution & Required Notices

- Components distributed under the **Apache-2.0** license (like Babylon.js and Prisma) require the preservation of copyright notices and any existing `NOTICE` files when distributing source code or derivative works.
- Components distributed under the **MIT** license require the original copyright notice and permission notice to be included in all copies or substantial portions of the software.

*Note: This document serves as a high-level summary and is not legal advice. When redistributing this project or any of its sub-components, ensure compliance with each individual library's license terms.*
