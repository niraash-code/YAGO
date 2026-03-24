# Testing Guide

YAGO uses a multi-tiered testing strategy.

## Running Tests

```bash
# All Rust tests
cargo test --workspace

# Specific crate
cargo test -p ini
cargo test -p vfs

# Frontend tests
bun test
```

## Test Structure

### Unit Tests

Each crate contains tests for its specific domain:

- `ini`: Parser and compiler tests
- `vfs`: Archive extraction and safety tests
- `storage`: Database and discovery tests
- `mod_patches`: Merger and validator tests
- `launcher`: Launch configuration tests

### Snapshot Tests

Uses `insta` for regression testing:

```bash
cargo test --test '*snapshot*'
```

## Code Quality

```bash
# Format code
cargo fmt --all

# Lint Rust
cargo clippy --workspace -- -D warnings

# Lint frontend
cd src-ui && bun run lint
```

## Common Commands

```bash
just cargo fmt    # Format code
just cargo clippy # Lint
just cargo test   # Run tests
just bun lint     # Frontend lint
```
