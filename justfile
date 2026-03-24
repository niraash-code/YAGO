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
    @echo "  just check           Check Rust code"
    @echo "  just watch           Watch for changes"
    @echo ""
    @echo "Testing:"
    @echo "  just test            Run all tests"
    @echo "  just bench           Run benchmarks"
    @echo "  just review          Review snapshots"
    @echo ""
    @echo "Quality:"
    @echo "  just lint            Clippy + format check"
    @echo "  just fmt             Format code"
    @echo ""
    @echo "Release:"
    @echo "  just release-deb     Build DEB package"
    @echo "  just release-rpm     Build RPM package"
    @echo "  just release-appimage Build AppImage"
    @echo "  just release-win     Build Windows EXE"
    @echo "  just release-all     Build all packages"
    @echo ""
    @echo "Setup:"
    @echo "  just setup           Initialize dev environment"
    @echo "  just clean           Clean build artifacts"
    @echo ""

# === Development ===

dev:
    bun run tauri dev

build:
    bun run tauri build

check:
    cargo check --workspace

watch:
    cargo watch -x check -x nextest

# === Testing ===

test:
    cargo nextest run

bench:
    cargo bench

review:
    cargo insta review

# === Quality ===

lint: fmt-check clippy

fmt:
    cargo fmt --all

fmt-check:
    cargo fmt --all -- --check

clippy:
    cargo clippy --all-targets --all-features -- -D warnings

ci: lint test bench

# === Crate-specific tests ===

test-ini:
    cargo test -p ini

test-vfs:
    cargo test -p vfs

test-storage:
    cargo test -p storage

test-mod-patches:
    cargo test -p mod_patches

test-launcher:
    cargo test -p launcher

test-sync:
    cargo test -p sync

test-resources:
    cargo test -p resources

test-loader:
    cargo test -p loader

# === Setup ===

setup:
    cargo make setup

clean:
    cargo clean
    rm -rf src-ui/dist
    rm -rf src-tauri/target

# === Frontend ===

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

# === Tauri ===

tauri-dev:
    bun run tauri dev

tauri-build:
    bun run tauri build

tauri-icon:
    bun run tauri icon

# === Release ===

release-init:
    cargo make init-release

release-deb:
    cargo make release-deb

release-rpm:
    cargo make release-rpm

release-appimage:
    cargo make release-appimage

release-flatpak:
    cargo make release-flatpak

release-win:
    cargo make release-windows

release-pkgbuild:
    cargo make release-pkgbuild

release-all:
    cargo make release-all

release-list:
    ls -la release/latest/ || echo "No releases found."

# === Linux-specific ===

setup-linux:
    cargo make setup-linux

setup-linux-deb:
    cargo make setup-linux-deb

setup-linux-rpm:
    cargo make setup-linux-rpm

setup-linux-arch:
    cargo make setup-linux-arch

# === Utilities ===

update:
    bun update
    cargo update
