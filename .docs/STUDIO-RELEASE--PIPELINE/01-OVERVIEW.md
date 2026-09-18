# Saints Gaming Studio Release Pipeline

## Overview

The Saints Gaming Modular Update Engine utilizes a monolithic release pipeline designed to convert fragmented database state ("Working World") into a highly optimized, immutable JSON payload ("WorldRelease"). This payload acts as the authoritative source of truth for the game engine and is subsequently pushed to the Go MMO backend via the Map Sync Service.

### The Problem it Solves
In an MMO environment, directly querying database tables (e.g., `WorldMap`, `WorldRegion`, `EntityInstance`) for every player login or map transition is extremely slow and susceptible to race conditions if developers are actively modifying the map in the Studio. 

### The Solution: The Pipeline
To solve this, the pipeline enforces strict separation between the **Working World** (the mutable state edited in the browser-based Studio) and the **Live Release** (the immutable snapshot the players actually play on).

The pipeline follows these stages:
1. **Bootstrap Revision Validation**: Ensures all map regions, voxels, and assets are fully hashed and ready for deployment.
2. **Setup / Publish Initiation**: The entry point where the user explicitly requests to "Publish" changes to the live game environment.
3. **World Compilation**: A strict, multi-phase compiler that resolves dependencies, packages assets, and generates a cohesive `ReleaseManifest`.
4. **Persistence & Promotion**: The manifest is saved as a `WorldRelease`, and the system performs an atomic "blue-green" deployment by promoting the new release to `LIVE` and demoting the previous one.
5. **Eager Sync Notification**: The pipeline immediately pings the external Go MMO socket server to ingest the new layout, regions, and collision grids, preventing client-server desync.

Read the subsequent documents in this folder for a deep dive into each stage of the pipeline.
