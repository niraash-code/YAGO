# Testing Guide

YAGO uses a multi-tiered testing strategy.

## Running Tests

```bash
# All Rust tests
cargo test

# Specific crate
cargo test -p ini
cargo test -p vfs

# Frontend tests
bun test
```

## Test Structure

### Unit Tests

Each crate has tests in `src/`:
- `ini`: Parser and compiler tests
- `vfs`: Archive extraction and safety tests
- `storage`: Database and discovery tests
- `mod_patches`: Merger and validator tests

### Snapshot Tests

Uses `insta` for regression testing.

## Code Quality

```bash
# Format code
cargo fmt

# Lint
cargo clippy --workspace -- -D warnings

# Frontend lint
bun run lint
```
