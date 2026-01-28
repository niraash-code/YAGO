# Testing Guide

YAGO employs a multi-tiered testing strategy to ensure the integrity of the VFS, mod logic, and process lifecycle.

## 🧪 1. Crate Unit Tests

Each crate in the `crates/` directory contains its own `tests/` folder. These tests are isolated and focus on the crate's specific domain logic.

**How to run:**
```bash
cargo test -p <crate_name>
```

| Domain | Test Modules |
| :--- | :--- |
| **Filesystem** | `archives.rs`, `safety.rs`, `vfs.rs` |
| **Database** | `discovery.rs`, `storage.rs`, `templates.rs` |
| **Logic** | `merger.rs`, `compiler.rs`, `validator.rs` |

## 🔗 2. Functional Flow Integration

Located in `crates/integration_tests/src/flows/`, these tests validate complex cross-crate workflows without involving the full GUI.

**Common Flows:**
*   `mod_management.rs`: End-to-end import, namespacing, and database persistence.
*   `launch_system.rs`: Binary identification, environment injection, and process monitoring.
*   `deployment.rs`: Planning and execution of the Virtual File System.

## 🤖 3. Simulation System

The simulation system (in `integration_tests/src/simulation/`) runs automated "User Stories" against mock assets located in the root **`fixtures/`** directory. It simulates:
- First-time setup.
- Power user mod reordering.
- Chaos Monkey (randomly deleting files/processes to test recovery).

## 🖥️ 4. Frontend Testing

Frontend logic, store mapping, and component integrity are tested via **Vitest**.

**How to run:**
```bash
cd src-ui && npm run test
```

## ✅ 5. Full Workspace Validation

The canonical way to verify the entire project before a commit is via the `Makefile`.

```bash
# Run all backend and integration tests
make test

# Run frontend type checking
make lint
```

---
[Back: Architecture Overview](architecture.md) | [Documentation Home](../index.md)
