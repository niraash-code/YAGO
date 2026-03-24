# Contributing

Thank you for your interest in contributing to YAGO!

## Setup

```bash
# Clone the repository
git clone https://github.com/niraash-code/YAGO.git
cd YAGO

# Install dependencies
bun install

# Run development server
bun run tauri dev
```

## Code Standards

### Rust

- Run `cargo fmt --all` before committing
- Run `cargo clippy --workspace -- -D warnings` to catch issues
- Add tests for new functionality

### Frontend

- Follow existing component patterns
- Use functional components with hooks
- Run `bun run lint` before committing

## Workflow

1. **Fork** the repository
2. **Branch**: Create a feature branch (`git checkout -b feature/my-feature`)
3. **Code**: Make your changes
4. **Test**: Verify with `cargo test` and `bun run lint`
5. **PR**: Open a pull request

## Project Structure

```
yago/
├── crates/           # Rust backend (8 crates)
│   ├── ini/          # INI parsing
│   ├── vfs/          # Virtual file system
│   ├── storage/      # Database
│   ├── mod_patches/  # INI patching
│   ├── launcher/     # Game launching
│   ├── sync/         # Asset sync
│   ├── resources/   # Downloads
│   └── loader/       # Mod loader
├── src-tauri/        # Tauri backend entry
├── src-ui/           # React frontend
└── justfile          # Development commands
```

## Reporting Issues

Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Rust version)
