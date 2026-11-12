# ASTEROIDS: DEEP SPACE

A self-contained, offline Canvas arcade shooter. Original procedural artwork and synthesized audio; no downloaded assets, dependencies, server, build tools, or installation.

## Play
Extract the entire folder, then double-click **index.html**. Keep style.css and js/ alongside it. Use a modern desktop Chrome, Firefox, Edge, or Safari browser with a keyboard.

- W / Up: thrust
- A / Left, D / Right: rotate
- Space (hold): fire
- Escape: pause/resume
- SOUND ON/OFF: toggle synthesized audio

Your ship retains momentum and wraps across screen edges. Large rocks take 3 hits and split into two medium rocks (2 hits), which split into two small rocks (1 hit). Destruction awards 35 / 60 / 100 points respectively. Clear all rocks to advance; each new wave repairs one hull segment. You have five hull segments and two seconds of shielding after damage. Waves grow in size and speed, with sensible upper bounds. Switching tabs or windows automatically pauses.

High score and mute settings are saved when browser localStorage is permitted. Private browsing and some file-URL policies may prevent persistence; gameplay still works. Audio starts only after a user gesture. Keyboard desktop play is the intended input; touch controls are not included.

## Source
Classic ordered scripts deliberately avoid ES-module file-URL restrictions:
- background.js: cached nebula and parallax stars
- player.js: detailed vector spacecraft, movement and weapons
- asteroid.js: cached irregular rock textures
- bullet.js: projectile motion and swept collision detection
- particles.js: capped particle pool
- ui.js: menus, HUD and Web Audio synthesis
- game.js: simulation, waves, collision and rendering
- main.js: input, resize and animation lifecycle

assets/images and assets/audio are intentionally empty: all visuals and audio are generated locally. Rendering uses a 1.5× maximum pixel ratio, cached backgrounds/rocks, at most 450 particles, a delta-time simulation and bounded wave populations.

All game code and procedural artwork created for this project. You may modify and use them in your game jam submission.

## Validation
All eight scripts were loaded in their HTML order and exercised in a JavaScript test harness using a native Canvas implementation. Checks passed for keyboard input, acceleration and shooting, large/medium/small asteroid destruction, score calculation, wave advancement, hull damage, game over, restart, pause/resume, resize, and storage writes. Canvas artwork rendered successfully. A real Chromium run was attempted but blocked by the execution environment's process-socket policy; full browser layout, audible audio and real localStorage persistence were not verified.
