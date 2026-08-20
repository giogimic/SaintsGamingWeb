/**
 * Saints Gaming — Unified Spatial & Interface Layer Hierarchy
 *
 * Defines strict, authoritative rendering and depth priorities so every current
 * and future editor/gameplay tool plugs in without visual overlap, fighting, or ambiguity.
 */

/**
 * 3D Viewport Altitude / Depth Layers (Y-Elevation on Ground Plane in Babylon.js)
 */
export const SPATIAL_LAYER_ALTITUDES = {
  BASE_MAP_GROUND: 0.00,      // Batched ground quads & terrain
  MAP_GRID_SKIRT: 0.01,       // Skirt padding & logic tile base
  EDITOR_GUIDES: 0.02,        // Map boundary borders, grid lines, ruler guides
  DESTINATION_PREVIEW: 0.025, // Soft click-to-move waypoint indicator
  SMART_TARGET_RING: 0.03,    // In-game ground reticle under targeted entities
  SELECTION_OVERLAY: 0.04,    // Editor selection boxes & multi-cell bounds
  BRUSH_PREVIEW: 0.05,        // Multi-cell brush radius & stamp footprint
  HOVER_INDICATOR: 0.06,      // Thin crisp hover outline (cursor focal point)
  TEMP_TOOL_PREVIEW: 0.07,    // Action previews, measurement lines, gizmo guides
  AUTHOR_MARKERS: 0.08,       // Warp gates, spawn points, spawner radius icons
  ENTITIES_OBJECTS: 0.10,     // 2.5D Characters, NPCs, Creatures, Props (RenderingGroupId 1)
  DEBUG_OVERLAYS: 0.15,       // Navmesh debug, collision hitboxes, raycasts
} as const;

export type SpatialLayerAltitudeKey = keyof typeof SPATIAL_LAYER_ALTITUDES;

/**
 * 2D DOM / React Interface Z-Index Layers
 */
export const INTERFACE_Z_INDEX = {
  VIEWPORT_CANVAS: 0,         // Babylon Canvas / WebGL Web context
  WORLD_SPATIAL_HUD: 10,      // Floating healthbars, nameplates, speech bubbles
  GAMEPLAY_DOCKS: 30,         // Action hotbar, minimap radar, vitals HUD
  FLOATING_WINDOWS: 40,       // Draggable panels (Inventory, Skills, Equipment, Quest Log)
  FLOATING_ACTIVE_FOCUS: 45,  // Currently focused / active draggable window
  FULLSCREEN_MODALS: 50,      // SaintsDex, Shop, Crafting, Battle overlays
  DEBUG_METRICS: 90,          // FPS counter, dev debug telemetry
  CONTEXT_MENUS: 100,         // Right-click context menus, item inspect tooltips
  SYSTEM_CURTAIN: 200,        // Map transitions, reconnect banners, critical toasts
} as const;

export type InterfaceZIndexKey = keyof typeof INTERFACE_Z_INDEX;
