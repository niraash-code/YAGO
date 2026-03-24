# Contributing to YAGO

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run the development server:
   ```bash
   bun run tauri dev
   ```

## Code Style

### Rust

- Run `cargo fmt` before committing
- Run `cargo clippy` to catch common mistakes
- Use meaningful variable names
- Add documentation for public APIs

### TypeScript/React

- Follow the existing component patterns
- Use functional components with hooks
- Run `bun run lint` before committing

## Project Architecture

YAGO uses a multi-crate Rust backend with a React frontend:

- **ini** - INI file parser (nom-based)
- **vfs** - Virtual file system for mod deployment
- **storage** - Game library and database management
- **mod_patches** - INI patcher and conflict resolution
- **launcher** - Game launching with Wine/Proton support
- **sync** - Asset synchronization and hashing

## Testing

Run tests with:

```bash
# Rust tests
cargo test

# Frontend tests
bun test
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linters
5. Submit a pull request

## Reporting Issues

Please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Your environment (OS, Rust version, etc.)