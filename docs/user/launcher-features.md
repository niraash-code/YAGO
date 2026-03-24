# Launcher Features

YAGO is both a mod manager and a game launcher.

## Linux Support

Built for Linux with support for:

- **Proton/Wine**: Automatic environment setup
- **Gamescope**: High-quality micro-compositor
- **Gamemode**: CPU and I/O optimization
- **MangoHud**: Performance overlay

## Performance

- **FPS Unlock**: Bypass the 60 FPS cap (up to 120+ FPS)
- **GPU Selection**: Force dedicated GPU on laptops
- **Borderless Window**: Optimal window mode for Unity games

## Injection Methods

Choose the method that works best for your setup:

1. **Proxy DLL (Default)**: Most stable option
   - Linux: Dual proxy (d3d11.dll + dxgi.dll)
   - Windows: Standard proxy injection

2. **ReShade Only**: Standalone ReShade without mod loader

3. **Loader (Memory Injection)**: For complex scenarios

## Environment Variables

YAGO automatically manages:
- `WINEPREFIX` / `STEAM_COMPAT_DATA_PATH`
- DXVK state cache
- Library paths for mod loaders
