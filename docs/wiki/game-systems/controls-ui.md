# Controls, User Interface & Audio Engine

Saints Gaming features an adaptive input system supporting desktop keyboard/mouse setups as well as native mobile touchscreen gestures and a procedural WebAudio sound synthesizer.

---

## 1. Mobile Touch Input System

Mobile devices automatically engage `MobileControls.tsx` with dedicated touch overlays:

### Virtual Joystick (Bottom-Left)
- Calculates relative thumb displacement from the initial touch anchor:
  $$\vec{u}_{\text{dir}} = \frac{\Delta \vec{p}}{\|\Delta \vec{p}\|}, \quad \text{Magnitude} = \min\left(1.0, \frac{\|\Delta \vec{p}\|}{R_{\text{max}}}\right)$$
- Drives continuous analog velocity for precise diagonal movement.

### Multi-Action Touchpad (Bottom-Right)
- **`[⚡ INTERACT]`**: Triggers NPC conversations, chest opening, and node gathering.
- **`[🎒 BAG]`**: Toggles the 28-slot player inventory.
- **`[⚔️ SKILLS]`**: Opens the 27-skill proficiency window.
- **`[💬 CHAT]`**: Focuses the mobile chat input bar.
- **`[⚙️ MENU]`**: Opens audio, graphics, and account settings.
- **`[⛶ FULLSCREEN]`**: Executes `requestFullscreen()` to maximize viewport space.

---

## 2. Desktop HUD & Dock Presets

The desktop interface (`src/web/components/the-lobby/hud/`) offers modular window management:

- **Minimap Radar (`MiniMapRadar.tsx`):** A circular compass HUD displaying nearby player dots, NPC icons, and active quest objective waypoints.
- **Dock Presets:** Custom window arrangements (Inventory, Target Frame, Chat, Skills, Equipment) are serialized into base64 JSON layout tokens, enabling one-click layout switching.
- **3D Overhead Billboards:** Player nametags, guild badges, health bars, and temporary chat speech bubbles render in 3D world space above character sprites.

---

## 3. WebAudio Soundscape Engine

To eliminate bulky audio downloads, sound effects are generated procedurally using the browser's WebAudio API:

| Event | Audio Synthesis Technique | Frequency & Envelope |
| :--- | :--- | :--- |
| **Level-Up Fanfare** | Arpeggiated sine wave chords with harmonic overtone chime. | $440\text{Hz} \to 880\text{Hz}$ with $0.8\text{s}$ exponential decay. |
| **Mining Strike** | Filtered noise burst blended with high-Q resonant ping. | High-pass filtered band at $1200\text{Hz}$. |
| **Skill Cape Emote** | Polyphonic 4-voice synthesized brass and strings progression. | 4-chord progression with stereo panning. |

> [!NOTE]
> WebAudio synthesizers initialize on the first user interaction event to comply with browser autoplay policies.

---

## 4. Default Keyboard Mappings

| Action | Primary Key | Alternate Key |
| :--- | :--- | :--- |
| Move North / South / West / East | `W` / `S` / `A` / `D` | `Up` / `Down` / `Left` / `Right` |
| Primary Action Hotbar Slots 1–8 | `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8` | Number row taps |
| Interact / Harvest / Talk | `Space` / `E` | Left Click |
| Target Next Nearest Enemy | `Tab` | Click Entity |
| Toggle World Map / Quest Log | `M` / `L` | HUD Icons |
