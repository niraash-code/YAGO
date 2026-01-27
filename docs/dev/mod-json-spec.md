# `mod.json` Specification v1.3

The `mod.json` file is the standardized manifest for mods in the YAGO ecosystem.

## 📄 Schema

```json
{
  "schema_version": 1.3,
  "meta": {
    "name": "Raiden Shogun - Boss Skin",
    "version": "1.0",
    "author": "ModGod",
    "url": "https://gamebanana.com/mods/12345",
    "preview_image": "images/cover.jpg"
  },
  "compatibility": {
    "game": "Genshin Impact",
    "character": "Raiden",
    "hashes": ["3f8a21bc", "8291acde"],
    "fingerprint": "a1b2c3d4e5f6..."
  },
  "config": {
    "tags": ["NSFW", "INA", "BOSS"],
    "keybinds": {
      "slot_1": { "label": "Toggle Skirt", "variable": "$skirt_state" }
    }
  }
}
```

## 🗝️ Key Fields

- **`compatibility.hashes`**: Used by `logic_weaver` to identify which vertex buffers this mod targets.
- **`config.keybinds`**: Allows the user to configure mod toggles directly through the YAGO UI.
- **`tags`**: Used for filtering and for the "Streamer Mode" safety checks.

---
[Next: INI Forge](ini-forge.md) | [Documentation Home](../index.md)
