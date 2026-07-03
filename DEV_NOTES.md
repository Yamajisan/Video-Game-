# Eldor's Chronicles / Echoes of Eldrador - Developer Notes

## Project Audit

This folder is currently an asset and story collection, not a complete Unity, Unreal, Godot, or other engine project.

- Engine markers found: none.
- Unity files found: none (`Assets/`, `ProjectSettings/`, `.unity`, `.cs` were not present).
- Unreal files found: none (`.uproject`, `Content/`, `.umap`, `.cpp` were not present).
- Godot files found: none (`project.godot`, `.tscn`, `.gd` were not present).
- Build configuration found: none.
- Git availability: the `git` command is not installed or not on PATH in this environment, so no commit was created.

## Existing Content

- `North Region/Elder_Mage_with_Staff_0318190000_generate.fbx` is the uploaded Elder Mage character asset, now tracked as an elder/mentor-class NPC reference rather than the procedural Aedrys hero.
- `North Region/Ancient Forests & Glacial Features/` contains forest concept imagery useful for the ancient forest mood.
- `North Region/Arkon Keep/`, `Dragon's Spine & Spire of Arkon/`, and settlement folders contain additional world and character concepts.
- `Huma/`, `The wayfarer/`, `The Oracle of the Lost Moon/`, and `Elder of the Sands/` contain additional FBX, ZIP, image, and animation references.
- Root `.txt` files contain story, map, storyboard, and integration notes.

## Added Demo

`ElradorsQuestDemo/` is a self-contained browser vertical slice built around the existing asset library and the uploaded `Eldor's Chronicles (1).pdf` pitch deck/GDD.

- Main playable scene: `ElradorsQuestDemo/index.html`
- Gameplay code: `ElradorsQuestDemo/src/game.js`
- Presentation styles: `ElradorsQuestDemo/src/styles.css`
- Asset manifest: `ElradorsQuestDemo/assets/asset-manifest.json`
- Full generated asset codex: `ElradorsQuestDemo/assets/world-assets.json`
- Human-readable full asset bible: `ElradorsQuestDemo/FULL_ASSET_BIBLE.md`
- Deck/lore extraction summary: `ElradorsQuestDemo/DECK_ANALYSIS.md`
- Local server helper: `ElradorsQuestDemo/launch_demo.ps1`

## Demo Scope

The demo now implements a playable WebGL 3D third-person-inspired vertical slice:

- Aedrys player with third-person movement, sprint, jump, climb, dash, Windwalk, glide, staff melee, arcane projectile, Frost Ward, Whisperwind, health, stamina, and mana.
- Smooth mouse camera with cinematic boss intro framing.
- Enemy AI for bandits and Spectral Warden enemies.
- Ethereal Warden boss with intro, boss health, spectral slash, rune projectile, shockwave, teleport, and Echo of Elyria reward.
- Quest flow: meet Eryndor, learn Eldrador lore, collect 3 glyphs, open Arkon Keep, solve Astral Alignment, unlock Frost Ward, enter Emerald Dominion, reveal hidden path with Whisperwind, defeat boss, claim Echo of Elyria.
- UI: main menu, pause menu, health/stamina/mana bars, quest tracker, quest journal, ability icons, dialogue box, boss health, interaction prompt, victory screen.
- Atmosphere: WebGL fog, lighting, blob shadows, glow-style materials, crystals, ruins, water, forest density, mountain cliffs, and particles.
- Full-asset integration pass: generated a codex for 112 assets and added in-game archive stones, expanded lore tablets, Dwarven settlement proxies, Akon camp, guardian/sentinel statues, Elder of the Sands and Lost Moon obelisks, and broader asset counts in the journal.

## Important Implementation Note

Because no full 3D engine or browser FBX loader exists in this repository, the playable character is represented in-game as a stylized WebGL Aedrys avatar while the exact FBX is linked and verified through the manifest/UI when served over HTTP. A future Unity/Unreal/Godot implementation can import the FBX as the actual skinned player model without changing the demo quest/combat design.

## Run Target

Use the browser demo as the current build target. Run `ElradorsQuestDemo/launch_demo.ps1`, then open `http://localhost:8090`.
