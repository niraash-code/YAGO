# mod.json Specification

The `mod.json` file is the manifest for YAGO-compatible mods.

## Schema

```json
{
  "schema_version": 1.3,
  "meta": {
    "name": "Character Skin Mod",
    "version": "1.0",
    "author": "ModAuthor",
    "url": "https://example.com/mod",
    "preview_image": "images/cover.jpg"
  },
  "compatibility": {
    "game": "Genshin Impact",
    "character": "Raiden",
    "hashes": ["3f8a21bc", "8291acde"]
  },
  "config": {
    "tags": ["NSFW", "BOSS"],
    "keybinds": {
      "slot_1": {
        "label": "Toggle Feature",
        "variable": "$feature_state"
      }
    }
  }
}
```

## Fields

### meta

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name of the mod |
| `version` | string | Semantic version string |
| `author` | string | Creator name |
| `url` | string | Link to mod page (optional) |
| `preview_image` | string | Path to cover image (optional) |

### compatibility

| Field | Type | Description |
|-------|------|-------------|
| `game` | string | Game name (e.g., "Genshin Impact") |
| `character` | string | Character/feature name (optional) |
| `hashes` | string[] | Vertex buffer hashes this mod targets |

### config

| Field | Type | Description |
|-------|------|-------------|
| `tags` | string[] | Categorization tags (NSFW, INA, BOSS, etc.) |
| `keybinds` | object | Configurable keybinds mapped to INI variables |

## Example

```json
{
  "schema_version": 1.3,
  "meta": {
    "name": "Raiden Shogun - Boss Skin",
    "version": "1.0.0",
    "author": "ModGod"
  },
  "compatibility": {
    "game": "Genshin Impact",
    "character": "Raiden",
    "hashes": ["3f8a21bc"]
  },
  "config": {
    "tags": ["NSFW", "BOSS"]
  }
}
```
