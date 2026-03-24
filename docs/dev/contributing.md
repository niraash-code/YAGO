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
- Run `cargo fmt` before committing
- Run `cargo clippy` to catch issues
- Add tests for new functionality

### Frontend
- Follow existing component patterns
- Use functional components with hooks
- Run `bun run lint` before committing

## Workflow

1. **Fork** the repository
2. **Branch**: Create a feature branch
3. **Code**: Make your changes
4. **Test**: Verify with tests and linters
5. **PR**: Open a pull request

## Project Structure

```
crates/
├── ini/          # INI parsing
├── vfs/          # File system
├── storage/      # Database
├── mod_patches/  # Patching
├── launcher/     # Game launching
├── sync/         # Sync
├── resources/    # Downloads
└── loader/       # Mod loader
```

## Reporting Issues

Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Rust version)
