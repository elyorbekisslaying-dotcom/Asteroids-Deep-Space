# ASTEROIDS: DEEP SPACE

An offline HTML5 Canvas arcade shooter. Open `index.html` in a modern desktop
browser with keyboard and mouse. Keep `style.css` and `js/` alongside it. All art,
icons and audio are procedural; there are no runtime dependencies or remote assets.
For itch.io, upload the game ZIP as an HTML project with `index.html` at its root.

## Controls and progression

- WASD moves in screen directions with normalized diagonals, fast acceleration and braking.
- Hold left mouse to aim and fire. The first ready shot fires on press. Otherwise
  the ship faces movement, retaining its last heading when stationary.
- E launches homing missiles. Escape or loss of focus pauses and clears input.
- Settings rebinds all four movement controls, fire and missiles. Existing weapon
  bindings, audio, high score and Endless unlock are preserved where compatible.
  The obsolete thrust binding is discarded; an old F thrust binding no longer moves.

Tutorial teaches movement, shooting for XP, hiring a drone and missiles, then
unlocks Endless. Browser storage retains that unlock across reloads. Storage may
be unavailable under some browser policies; the current session still works.

The sector is 4800 × 3600 world units. The camera follows smoothly; the ship stops
at boundaries and can slide along them. Resize does not relocate world objects.
Asteroids retain momentum, health and splitting; distant rocks gently steer back
into combat so waves do not strand debris across the map. Spawns are outside the
viewport on an available side, at least 450 units from the player.

XP starts at 18 and grows as `round(18 + 8*(level-1) + 1.2*(level-1)^1.5)`.
A fully split large asteroid gives 11 XP. Excess XP carries into subsequent levels,
including consecutive reward screens. Each screen offers three distinct upgrades.
Hull Plating adds a visible segment; each cleared wave repairs one segment.

## Fleet

Recruit Gunner, Scout, Tank or Support repeatedly, with no hiring cap. The
sunflower formation expands with fleet size and shifts inward near world edges.
Gunner provides steady fire, Scout rapid fire, Tank heavy fire and projectile
interception, and Support repairs the player. Fleet upgrades affect all recruits.
Combat drones search at 4 Hz and lead asteroids using projectile speed, inherited
shooter velocity, muzzle offset and lifetime. Unreachable intercepts use direct aim.
Offscreen ships/projectiles are culled; ordinary bullets have no expensive glow.

Support shares one repair clock: `max(7, 15 / (1 + .45*log2(count)) * upgrade)`
seconds per HP. One Support initially repairs every 15 seconds, three approximately
8.75 seconds. Damage resets the clock. No upgrade can reduce it below 7 seconds.

## Enemies and tuning

All initial tuning lives in `js/config.js`; values are world units, seconds and HP.

| Role | First wave | Base HP | Speed | Attack |
| --- | ---: | ---: | ---: | --- |
| Raider | 1 | 7 | 150 | 3-shot burst every 2.7s, strafes at 310 units |
| Sniper | 2 | 9 | 125 | 1.3s fixed warning line, 2 HP shot, 3.8s recovery |
| Rammer Tank | 3 | 26 | 110 | 1.1s warning, 620-speed dash for .7s, 2 HP impact, 1.3s recovery |
| Interceptor | 4 | 5 | 280 | 2-shot burst, retreat and return, 3s cycle |
| Mine Layer | 5 | 12 | 135 | One mine per 3.5s, max 5 per layer / 24 globally |

Enemy hull gains `floor(.65*(wave-1))` HP. Mines have 2 HP, arm in 1.5s and expire
in 18s. Wave populations grow gradually to 28 with mixed roles and asteroid packs.
Each role has a distinct silhouette and synthesized attack sound. Telegraphs
remain visible before heavy attacks; mines can be shot or avoided.

## Development and verification

No build or installation step. For development:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# In another terminal, with Python Playwright and /usr/bin/chromium installed:
python3 tests/browser_smoke.py
```

The browser smoke test covers a clean-profile Tutorial, persistent unlock,
combat-earned Endless reward, repeated recruitment, bindings, world boundaries,
projectile damage, intercepts, repair timing, XP overflow and large fleets.
See `PLAYTEST.md` for measured results, test scope and remaining manual checks.
