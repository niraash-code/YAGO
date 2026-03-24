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
    mkdir -p release/latest release/older release/build/temp release/build/deb release/build/rpm release/build/windows release/build/appimage release/build/flatpak release/build/pkgbuild

setup-full:
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
    mkdir -p release/latest release/older release/build/temp release/build/deb release/build/rpm release/build/appimage release/build/flatpak release/build/pkgbuild

release-deb:
    cd src-tauri && cargo tauri build --bundles deb
    cp src-tauri/target/release/bundle/deb/*.deb release/latest/

release-rpm:
    cd src-tauri && cargo tauri build --bundles rpm
    cp src-tauri/target/release/bundle/rpm/*.rpm release/latest/

release-appimage:
    cd src-tauri && NO_STRIP=1 APPIMAGE_EXTRACT_AND_RUN=1 cargo tauri build --bundles appimage
    cp src-tauri/target/release/bundle/appimage/*.AppImage release/latest/YAGO-x86_64.AppImage

release-win:
    cd src-tauri && bun run tauri build --bundles nsis
    cp src-tauri/target/release/yago.exe release/latest/yago-portable.exe
    cp src-tauri/target/release/bundle/nsis/*.exe release/latest/yago-setup.exe

release-all: release-deb release-rpm release-appimage release-win

release-list:
    ls -la release/latest/ || echo "No releases found."

# === Utilities ===

update:
    bun update
    cargo update
