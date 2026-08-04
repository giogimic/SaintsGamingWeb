# Saints Studio — Gap Closure Register (33)

**Status:** Living register — every audit finding from the 16–28 review mapped to closure  
**Date:** 2026-08-04  
**Rule:** A row is **OPEN** only if no doc defines it. After 29–32, architectural rows should be **CLOSED** (implementation may remain).

> **Masters:** [`29`](./29-studio-glossary-canonical.md) names · [`30`](./30-studio-editor-kernel-standard.md) editors · [`31`](./31-studio-integration-contracts.md) wiring · [`32`](./32-studio-commercial-completeness.md) industry bar.

---

# 1. Naming collisions → CLOSED

| Finding | Closure |
| :--- | :--- |
| Walk/Paint vs Build/NPC modes | **29** §1 — UI labels + StudioMode ids + Populate subFocus |
| Catalog missing from 16 | **29** §1 — sixth mode Catalog |
| PanelId sprawl 22–27 vs 19 | **29** §8 complete registry; **30** zoning |
| gameId / StudioProject / profileId | **29** §2 — project.id === gameId; aiProfileId rename |
| content_reload vs map_reloaded vs admin_save_map | **29** §6 — canonical event; save HTTP-only |
| ItemTemplate vs GameItem / QuestTemplate vs GameQuest | **29** §4 SoT table |
| Prefab vs Template vs Definition | **29** §5 |
| Entity instance 17/18/20 | **29** — EntityInstanceV1 only |
| EntityRef overload | **29** §3 ResourceRef / MapEntityRef |
| AiProfile profileId vs world profile | **29** aiProfileId |
| Permission Admin400 vs Developer narrative | **29** §9 matrix |
| Quest gold vs credits | **29** §7 RewardBundle |
| 22 vs 24 objectives | **29** supersession → 24 |
| isCreationMode vs flags | **29** §1.3 creationActive |
| Tileset triple registry | **29**/21 — paint uses map tilesets; GameAsset; TileRegistry metadata |

---

# 2. Duplicated logic → CLOSED

| Kernel | Closure |
| :--- | :--- |
| CatalogEditorShell | **30** §2 mandatory |
| SchemaFieldRenderer / Inspector | **30** §3 |
| ConditionBuilder / RewardBuilder | **30** §6 + **31** §1 |
| validate soft/hard | **31** §15 |
| Save → audit → reload | **30** §4.1 + **28**/31 |
| LootService.roll single path | **31** §3 |
| Dependency / Used-by one index | **31** §6 + **29** ResourceRef |
| Hot-reload union | **29** §6 |
| Permission resolver | **31** §14 |
| Undo scopes | **30** §7 |
| Ctrl+K completeness | **30** + **29** PanelIds/SearchDocument types |
| Publish checklist one sequence | **31** §6.1 |

---

# 3. Missing commercial workflows → CLOSED or PARKED

| Workflow | Status | Where |
| :--- | :--- | :--- |
| Soft locks / presence | CLOSED (designed) | **32** §1 |
| PIE isolation | CLOSED | **32** §4 |
| Unified graph kit | CLOSED | **30** §5 |
| L10n E2E pipeline | CLOSED | **32** §5 + **31** §7 |
| CI content validation | CLOSED | **32** §7 |
| Content VC UX | CLOSED | **32** §2 |
| Autosave / crash recovery | CLOSED | **32** §3 |
| Cross-map clipboard | CLOSED | **30** §7 |
| Batch rename | CLOSED | **32** §13 |
| Import Hub | CLOSED | **32** §8 |
| Timeline / audio buses | CLOSED baseline | **32** §11 |
| Plugin SDK | CLOSED (manifest) | **32** §9 |
| Creator telemetry | CLOSED | **32** §10 |
| Net diagnostics | CLOSED | **32** §12 |
| Player a11y authoring | CLOSED | **32** §6 |
| CRDT / git-map branches / particle graph / UGC storefront | PARKED | **32** §15 |

---

# 4. Poor UX / chrome drift → CLOSED

| Finding | Closure |
| :--- | :--- |
| Menus missing Project/Packages/Team | **30** §1.1 |
| Status missing version/locale/role/reload | **30** §1.2 |
| Brush 1/3/5 vs 7 | **30** §1.3 |
| Ctrl+Shift+P / FPS shortcut | **30** §1.3 |
| Dock float vs rail density | **30** §1.4 |
| Outliner regions/entities | **30** §1.5 |
| Problems panel missing | **30** §8 |
| Standardized every editor/panel/workflow | **30** §§2–4 |

---

# 5. Scalability / debt → SCHEDULED

| Debt | Register |
| :--- | :--- |
| Triple maps / dual save / dual reload | **32** §14 + **28** BE phases |
| db push prod | **32** §14 LO6/BE7 |
| JSON strings | **28** serializer |
| Orphan SchemaFieldRenderer | **30** EK2 |
| Client DB writers | **31** §16 |
| Audit retention | **32** §13 |
| Accuracy 0–1 | **31** §5 |

---

# 6. Integration holes → CLOSED

| Pair | Contract |
| :--- | :--- |
| Economy ↔ Quest rewards | **31** §2 |
| NPC ↔ Quest ↔ Dialogue | **31** §2 |
| Loot ↔ Death ↔ Gather ↔ Chest | **31** §3 |
| Items ↔ Loot ↔ Recipe ↔ Shop | **31** §4 |
| Ability ↔ Class ↔ Combat ↔ Skills | **31** §5 |
| Publish ↔ Deps ↔ Packages ↔ Audit ↔ Reload | **31** §6 |
| L10n ↔ string fields | **31** §7 |
| WorldEvent orchestration | **31** §8 |
| Cutscene ↔ Quest ↔ Walk | **31** §9 |
| AI ↔ Creature ↔ Spawner ↔ Encounter | **31** §10 |
| Map save ↔ client mesh | **31** §11 |
| Search/Tasks/Bookmarks | **31** §12 |
| Audit mandatory list | **31** §13 |
| Website Slice E boundary | **31** §17 |
| Integration tests I1–I15 | **31** §18 |

---

# 7. Architectural gap verdict

| Question | Answer |
| :--- | :--- |
| Are there undefined production tools? | No — 27 + 29 PanelIds |
| Are there undefined backend planes? | No — 28 |
| Are names still forked? | No — 29 normative |
| Are editors unstandardized? | No — 30 |
| Are systems unwired? | No — 31 |
| Are industry expectations silent? | No — 32 CLOSED or PARKED |
| Does implementation remain? | **Yes** — design stack complete; code phases BE/LO/EK/CC/product |

**No obvious architectural gaps remain in the Studio design constitution.** Further “Continue” requests should either implement phases or deepen a parked item into a first-class doc — not reinvent 16–33.

---

# 8. Read order (commercial suite)

1. **29** glossary (always)  
2. **30** kernel  
3. **31** integrations  
4. **32** commercial bar  
5. **33** this register  
6. Domain depth **18–28** as needed  
7. Feel **16** · layers **08** · ALIGNMENT for code truth  

---

# Final Rule

**Design stops when the register is green.**  
Implementation starts at BE1/LO1/EK1/CC1 without waiting for another architecture fork.
