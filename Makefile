.PHONY: help setup dev build check test lint format clean dev-cycle ci release-all release-appimage release-flatpak release-deb release-rpm release-pkgbuild release-windows release-list release-cleanup

# Default target
help:
	@echo "Available targets:"
	@echo "  make setup          - Run setup script"
	@echo "  make dev            - Start development mode"
	@echo "  make build          - Build for production"
	@echo "  make check          - Check Rust code"
	@echo "  make test           - Run all tests"
	@echo "  make test-backend   - Run backend tests (workspace)"
	@echo "  make test-<crate>   - Run tests for specific crate (e.g., test-fs-engine)"
	@echo "  make test-release-<pkg> - Test specific release package (e.g., test-release-deb)"
	@echo "  make lint           - Lint all code (Rust + Frontend)"
	@echo "  make format         - Format all code (Rust + Frontend)"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make dev-cycle      - Quick development cycle (check + lint + test)"
	@echo "  make ci             - Full CI pipeline"
	@echo "  make release-all    - Build all release packages"
	@echo "  make release-list   - List current release builds"
	@echo "  make release-cleanup- Interactive cleanup of old releases"
	@echo "  make release-appimage"
	@echo "  make release-flatpak"
	@echo "  make release-deb"
	@echo "  make release-rpm"
	@echo "  make release-pkgbuild"
	@echo "  make release-windows"

setup: sync-env
	./scripts/setup.sh

sync-env:
	npm run sync-env

dev: sync-env
	npm run tauri:dev

build: sync-env
	npm run build

check:
	cargo check

test: test-backend

test-backend:
	cargo test --workspace -- --test-threads=1

# Individual Crate Tests
test-fs-engine:
	cargo test -p fs_engine

test-ini-forge:
	cargo test -p ini_forge

test-integration:
	cargo test -p integration_tests

test-librarian:
	cargo test -p librarian

test-loader-ctl:
	cargo test -p loader_ctl

test-logic-weaver:
	cargo test -p logic_weaver

test-proc-marshal:
	cargo test -p proc_marshal

test-sophon-engine:
	cargo test -p sophon_engine

# Release Testing
test-release-appimage:
	./build_tools/run-builds.sh appimage

test-release-flatpak:
	./build_tools/run-builds.sh flatpak

test-release-deb:
	./build_tools/run-builds.sh deb

test-release-rpm:
	./build_tools/run-builds.sh rpm

test-release-pkgbuild:
	./build_tools/run-builds.sh pkgbuild

test-release-windows:
	./build_tools/run-builds.sh windows

test-release-all:
	./build_tools/run-builds.sh all

lint:
	cargo clippy
	cd src-ui && npm run lint || echo "Warning: 'npm run lint' failed or is missing. Check package.json."

format:
	cargo fmt
	cd src-ui && npm run format || echo "Warning: 'npm run format' failed or is missing. Check package.json."

clean:
	cargo clean
	rm -rf src-ui/dist
	rm -rf src-tauri/target

dev-cycle: check lint test

ci: setup dev-cycle build

release-all:
	./build_tools/build-all.sh

release-appimage:
	./build_tools/build-appimage.sh

release-flatpak:
	./build_tools/build-flatpak.sh

release-deb:
	./build_tools/build-deb.sh

release-rpm:
	./build_tools/build-rpm.sh

release-pkgbuild:
	./build_tools/build-pkgbuild.sh

release-windows:
	./build_tools/build-windows.sh

release-list:
	ls -R release/latest/ || echo "No releases found."

release-cleanup:
	./build_tools/cleanup.sh
