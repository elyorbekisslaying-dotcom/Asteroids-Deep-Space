# Fleet/world combat validation

Base verified from remote `flight-training-endless`:
`590094bf62f2046649cb8136e7e433f3f5f64ee1` (PR #1 base requested for this work).
Changes are isolated in `fleet-world-combat`.

## Automated Chromium walkthrough

A fresh browser context starts with Endless locked. Keyboard and pointer input
complete Tutorial (movement, asteroid shooting, drone reward, missiles, final
Raider). Reload retains the unlock. Endless earns its first reward from combat.
The automated Endless aim driver uses interception and temporary invulnerability
so random damage cannot interrupt progression; this is not a human difficulty test.
Repeated Scout hiring is separately exercised through real reward-card clicks with
controlled reward fixtures. No held fire leaks through those clicks.

## Deterministic scenarios

- All four world edges stop the appropriate velocity; spawns stay offscreen,
  inside the sector and at safe distance. World entities survive resize unchanged.
- Moving pointer fire, resize aim, pause/focus input clearing, migration of old F
  thrust and persistence of a new movement key.
- Sniper projectile removes 2 of 5 HP. Tank starts with 26 HP and impact removes 2.
  Sniper direction locks during its warning. Every mobile role pursues distant players.
- A 280-unit/second transverse asteroid is hit with the computed intercept,
  including inherited shooter velocity and muzzle offset.
- Three Support heal once after approximately 8.75s, not during the first 6s;
  incoming damage resets the shared clock. A separate test confirms the first Support waits 15s and even 100 Support
  with an extreme upgrade cannot heal during the first 6s (7s minimum).
- XP thresholds at levels 1/2/5/10/20: 18/27/60/122/269. One fully split rock
  awards 11 XP. A 200-XP fixture carries excess into consecutive reward screens.
- Mines respect arming delay and expiry. Recruits remain available indefinitely.
- 50, 100 and 150 drones fight 20 mixed enemies for 180 simulated frames each,
  with rendering. These are CPU submission timings, not display FPS or a guarantee
  for other hardware. Final measured mean update/draw submission: 2.31ms (50), 3.31ms (100),
  3.70ms (150). Full results are emitted by `tests/browser_smoke.py`.

## Limits

Chromium's managed policy blocks `file://` navigation, so browser execution was
validated over local HTTP. The distributable uses only classic scripts and local
relative resources, with `index.html` at the ZIP root and no network dependency.
A user-browser double-click launch and actual itch.io upload remain untested.
The reference itch.io page returned proxy HTTP 403; the requested combat principles
were followed without accessing its assets. No reference assets were copied.

Screenshots were inspected for layout and fleet separation. Audible sound and
extended human playtesting of late-wave balance remain to be assessed. Initial
balance parameters are centralized for that next playtest, rather than asserted
as a final difficulty curve.
