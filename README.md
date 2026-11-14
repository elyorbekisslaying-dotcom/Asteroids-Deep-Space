# ASTEROIDS: DEEP SPACE

An offline Canvas arcade shooter with procedural artwork and synthesized audio.
Open `index.html` in a modern desktop browser. Keep `style.css` and `js/`
alongside it. The game requires a keyboard and mouse and runs without a server.

## Controls

- Mouse movement aims the ship.
- W thrusts toward the cursor. The ship retains momentum and wraps around edges.
- Hold left mouse to fire.
- E launches a salvo of homing missiles.
- Escape pauses. Leaving the window also pauses an active flight.

Settings saves bindings for thrust, fire and missiles, plus the sound toggle.
Click the control you want to change, then press a key or click the arena to
bind left mouse. Choosing an occupied binding swaps the two controls.

## Modes

Tutorial is a short flight that teaches thrust, fire, XP, drone recruitment and
missiles. Completing it unlocks Play (Endless). The unlock, bindings, audio
preference and Endless high score are saved when local storage is available.

In Endless, destroying enemies and asteroid fragments grants XP. On each level
the fight pauses for a choice of three rewards drawn from ship upgrades,
missile upgrades and drone recruits or upgrades. Ship and drone upgrades last
for that flight. The starting hull has five segments. Hull Plating adds one
segment and repairs it. Each cleared wave repairs one segment.

Gunner and Scout drones fire automatically, with Scout prioritizing rate of
fire. Tank trades formation speed for heavier fire and can absorb incoming
shots. Support repairs damaged hull over time. Up to four different drones can
fly in formation at once.

Raiders shoot at the player. Snipers lock their firing angle and show a
warning line before firing. Rammers charge after a visible wind-up. Every
fifth wave contains a Carrier boss, which launches fighters and repair drones.
Destroying the repair drones slows the Carrier's recovery.

Scripts load as classic JavaScript for offline file compatibility. Existing
asteroid splitting, momentum, procedural nebula, player ship art and sound
synthesis are used throughout.
