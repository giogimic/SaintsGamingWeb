# Gameplay Controls — 2026-10-03

## Request

Restore middle-click cursor show/hide, expose a saved in-game binding for it, and correct excessively fast arrow-key camera rotation and ineffective sensitivity.

## Findings

- The live path is `PlayerClient → ClientApp → GameCanvas → EngineCore → CameraManager`. The old `src/engine/InputController.ts` has middle-click cursor logic, but the active client only recorded `Mouse1`; its canvas click handler did nothing.
- Active keyboard look multiplied a per-second input by `deltaTime * 60`, producing about 825 degrees/second at default sensitivity. The settings event did not apply mouse sensitivity or vertical inversion.
- `hydrateClientSettings` had no startup caller. Saved settings were written but never restored into the client, and the camera usually mounts after the first settings event.

## Changes (2.2.109)

- `TOGGLE_CURSOR` defaults to `Mouse1`. Settings parsing fills this default for existing saved settings. In-game Controls includes input capture, readable labels, conflict rejection and reset.
- GameCanvas handles the binding in the original keyboard/pointer event, ignores keyboard repeat, prevents browser autoscroll and uses real pointer lock to hide the cursor. An intentional release keeps the menu closed; Escape restores the cursor and opens options.
- Pointer lock tracks ownership, releases for menus, live dialogues and typing focus, and rechecks eligibility after an asynchronous capture completes. Input listeners and subscriptions are removed on unmount.
- Arrow look is 60 degrees/second at 1x, scaled by elapsed time once. Elapsed time is capped at 0.1 seconds to limit jumps after a stall. Separate `keyboardLookSensitivity` (0.1–3x) controls arrow turning; mouse sensitivity controls mouse movement.
- Camera controls apply on initialization and settings updates, preserving orientation and wheel zoom for unrelated changes. Startup loads saved settings before starting client systems.
- Client remounts retain the canvas attached by the child engine instead of replacing it with a null input target. Perspective changes synchronize the stored look pitch with the visible camera angle so the next look input does not jump.
- Menus and editable fields block camera input, with accumulated mouse movement discarded. Input state clears on browser focus loss.

Browser event reference: [MDN auxclick](https://developer.mozilla.org/en-US/docs/Web/API/Element/auxclick_event) documents canceling middle-button autoscroll/paste through `pointerdown` and handling right-click context menus separately. The cursor action cancels `pointerdown`; the canvas's existing InputManager context-menu handler remains active.

## Scope and verification

The changed gameplay path is the active ClientApp. The older Studio/playtest engine has separate input handling and was not changed by this fix. No database contract changes.

- `npx tsc --noEmit --pretty false`: passed, exit 0, after the final remount and pitch fixes.
- `npm run build`: passed, exit 0, on the final code. Next compiled successfully (86 seconds), checked types, generated 88 static pages and built the worker bundle.
- Diff whitespace checks passed with `cr-at-eol` enabled to preserve the existing CRLF source files. Two independent read-only reviews found and corrected dialogue/focus capture, late pointer-lock acquisition, conflicting existing shortcuts, remount input targeting and pitch synchronization issues.

No test suite was added or run for this task. Browser pointer-lock behavior and camera feel still need an interactive game check.
