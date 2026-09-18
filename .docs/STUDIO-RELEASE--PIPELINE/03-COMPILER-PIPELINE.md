# Compiler Pipeline (`WorldCompiler.ts`)

The compiler orchestrator translates the "Working World" relational data models into a unified, flat `ReleaseManifest` JSON object.

## Design Philosophy
1. **Publish-only**: The compiler strictly READS data. It never modifies the Working World tables.
2. **Immutable**: The output `ReleaseManifest` is entirely self-contained. All necessary logic, assets, definitions, and locations are embedded.
3. **Transitive Extraction**: Instead of dumping the entire database, the compiler parses Map entities and recursively fetches ONLY the NPCs, creatures, abilities, and assets actually placed in the world.

## Compiler Phases

### 1. Initialization and Validation
- Iterates over all maps assigned to the `worldProject`.
- Scans `entitiesData` and `gatesData` to find the gate matching the GameConfig's `defaultSpawnGateId` (The Canonical Spawn).
- If the canonical spawn is missing, **Compilation Aborts**.

### 2. Atlas Compiler (`AtlasCompiler.ts`)
- Queries all `WorldRegion` records for the included maps.
- Ensures every region has an `artifactChecksum`.
- Generates a flat lookup map: `region_key -> checksum`.
- Adds used regions to `requiredRegions` context.

### 3. Sub-Dependency Resolvers
These phases parse the maps and recursively extract dependencies:
- **`ActorDependencyResolver.ts`**: Extracts NPCs, hostile monsters, and capture-able creatures placed on the maps.
- **`GameplayDependencyResolver.ts`**: Crawls the extracted actors and map triggers to extract necessary abilities (skills), items (loot drops/vendor stock), and quests.
- **`ConnectionCompiler.ts`**: Links warp gates and transits across different maps into a cohesive fast-travel manifest.

### 4. ReleaseValidator (`ReleaseValidator.ts`)
Before persisting, the orchestrator invokes a validator that checks for missing definitions (e.g., an NPC requiring an item that was deleted from the database). Warning lists and Error lists are pushed to the UI logger.

### Output
The final `ReleaseManifest` is returned to the route handler to be written to a new `WorldRelease` Prisma row as a massive JSON blob.
