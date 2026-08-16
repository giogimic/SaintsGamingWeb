# 📱 Mobile Touch Controls & User Interface

Saints Gaming provides a dedicated, adaptive user interface supporting desktop keyboard/mouse setups as well as touchscreens and mobile devices.

---

## 1. Mobile Touch Mode (`MobileGameLauncher.tsx`, `MobileControls.tsx`)

When loading the client on mobile devices or tablets, the UI initializes touch input surfaces:

### Virtual Joystick
- Located at the **bottom-left** of the screen.
- Features dynamic thumb tracking: touching and dragging translates into directional vectors ($X/Y$), driving character movement with analog speed.

### Multi-Action Touchpad
Located at the **bottom-right** of the screen with quick-action buttons:
- **`[⚡ INTERACT]`**: Triggers NPC conversations, chest opening, and node gathering.
- **`[🎒 BAG]`**: Toggles the player's 28-slot inventory grid.
- **`[⚔️ SKILLS]`**: Opens the 27-skill proficiency overview.
- **`[💬 CHAT]`**: Opens the mobile-optimized chat input bar.
- **`[⚙️ MENU]`**: Opens character settings and graphics toggles.
- **`[⛶ FULLSCREEN]`**: Invokes native browser `document.documentElement.requestFullscreen()` to hide browser URL bars and maximize canvas real estate.

---

## 2. Desktop HUD & Dock Presets

The desktop HUD (`src/web/components/the-lobby/hud/`) utilizes a dock layout engine:
- **Minimap Radar (`MiniMapRadar.tsx`):** Displays nearby player dots, NPC markers, and active quest objective waypoints in a circular compass frame.
- **Dock Presets:** Players can customize and save window arrangements (Inventory, Target Frame, Chat, Skills, Equipment) with custom layout strings encoded in base64/JSON.
- **Overhead Billboards:** Player nametags, health bars, clan tags, and dynamic chat speech bubbles render directly above character heads in 3D world space.

---

## 3. WebAudio Soundscapes & Emote Synthesis

The client integrates WebAudio API generators to provide immediate sound feedback for actions (level-ups, item pickup, mining strikes, and skill cape emote fanfares) without requiring massive audio asset downloads.
