# YAGO - Justfile
# Central command hub for all development tasks

# Default recipe - show help
default: help

# Help
help:
    @echo "YAGO - Available Commands"
    @echo ""
    @echo "Development:"
    @echo "  just dev              Run development server"
    @echo "  just build           Build for production"
    @echo "  just check           Type check (cargo + tsc)"
    @echo ""
    @echo "Frontend (bun):"
    @echo "  just bun i           Install dependencies"
    @echo "  just bun dev         Frontend dev server"
    @echo "  just bun build       Frontend build"
    @echo "  just bun lint        Lint frontend"
    @echo "  just bun test        Run frontend tests"
    @echo ""
    @echo "Backend (cargo):"
    @echo "  just cargo build     Build all crates"
    @echo "  just cargo test      Run all tests"
    @echo "  just cargo clippy    Lint with clippy"
    @echo "  just cargo fmt       Format code"
    @echo ""
    @echo "Tauri:"
    @echo "  just tauri dev       Tauri dev mode"
    @echo "  just tauri build     Tauri production build"
    @echo "  just tauri icon      Generate icons"
    @echo ""
    @echo "Utilities:"
    @echo "  just clean           Clean build artifacts"
    @echo "  just update          Update dependencies"

# Development
dev:
    bun run tauri dev

build:
    bun run tauri build

check: cargo-check tsc-check

# Frontend (bun)
bun-i:
    bun install

bun-dev:
    cd src-ui && bun run dev

bun-build:
    cd src-ui && bun run build

bun-lint:
    cd src-ui && bun run lint

bun-test:
    cd src-ui && bun test

# Backend (cargo)
cargo-build:
    cargo build --workspace

cargo-test:
    cargo test --workspace

cargo-clippy:
    cargo clippy --workspace -- -D warnings

cargo-fmt:
    cargo fmt --all

cargo-check:
    cargo check --workspace

# Tauri
tauri-dev:
    bun run tauri dev

tauri-build:
    bun run tauri build

tauri-icon:
    bun run tauri icon

# Utilities
clean:
    cargo clean
    rm -rf src-ui/dist
    rm -rf src-ui/.astro

update:
    bun update
    cargo update
