# Launcher Features

YAGO is more than just a mod manager; it is a high-performance game launcher.

## 🐧 Linux Support

YAGO is built with Linux in mind. It handles the complex command chain required for peak performance:

- **Proton/Wine**: Automatic environment variable management.
- **Gamemode**: Optimizes CPU and I/O priorities.
- **Gamescope**: Provides a high-quality micro-compositor.
- **MangoHud**: Displays performance metrics.

## 🚀 Performance Optimizations

- **FPS Unlock**: Supports unlocking frame rates beyond the official 60 FPS limit (up to 120+ FPS).
- **GPU Forcing**: Ensures your laptop uses its dedicated GPU (`GpuPreference=2`) for maximum performance.
- **Unity Arguments**: Automatically applies borderless windowed mode and custom resolution flags.

## 💉 Injection Methods

YAGO supports multiple methods for 3DMigoto and ReShade injection:

1.  **Proxy DLL (Default)**: The standard and most stable method. It uses a "Dual Proxy" (side-by-side) strategy on Linux, loading both the mod loader (`d3d11.dll`) and ReShade (`dxgi.dll`) automatically.
2.  **ReShade Only**: Installs ReShade as a local proxy without the mod loader.
3.  **Loader (Memory Injection)**: Uses a dedicated loader executable for injection, often preferred for specific compatibility scenarios on Windows.

---
[Next: Safety & Streamer Mode](safety.md) | [Documentation Home](../index.md)
