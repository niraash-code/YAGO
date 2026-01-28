# Contribution Guide

Thank you for your interest in contributing to YAGO! This guide outlines the workflow and standards for contributing to our modular architecture.

## 🛠️ Setting Up Your Environment

1. **Clone the Repo**: `git clone https://github.com/niraash-code/YAGO.git`
2. **Install Dependencies**: Run `./scripts/setup.sh` to install Rust, Node.js, and core dependencies.
3. **Run Dev Mode**: `make dev` starts the frontend and backend with hot-reloading.

## 📂 Project Structure Note

Before making changes, please read **`STRUCTURE.md`** in the root directory. It provides a detailed map of how logic is distributed between the React frontend, Tauri host, and specialized logic crates.

## ✅ Quality Standards

- **Rust**:
    *   Run `cargo clippy --workspace -- -D warnings` to check for linting issues.
    *   Run `cargo fmt --all` to format your code.
    *   Add unit tests in the relevant crate's `tests/` directory.
- **Frontend**:
    *   Run `make lint` for TypeScript validation.
    *   Run `npm run format` in `src-ui` to apply Prettier rules.
- **Full Verification**:
    *   Execute `make test` to run the entire workspace test suite.

## 🤝 Workflow

1.  **Branching**: Create a feature branch: `git checkout -b feature/my-cool-fix`.
2.  **Implementation**: Ensure your changes are modular and adhere to the existing patterns in `src-ui/src/` or `crates/`.
3.  **Tests**: Verify your changes with both unit and flow tests.
4.  **Pull Request**: Open a PR describing the technical rationale and the specific modules affected.

---
[Documentation Home](../index.md)
