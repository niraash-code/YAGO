# INI Forge & Compilation

`ini_forge` treats `.ini` files as **Code**, not just configuration.

## 🔍 Parsing Logic

Using the `nom` parser combinator library, `ini_forge` constructs an Abstract Syntax Tree (AST) of the 3DMigoto logic.

- **Zero-Copy**: The parser avoids unnecessary allocations by referencing the original input string.
- **Command Support**: Unlike standard INI parsers, `ini_forge` understands procedural commands like `run = CommandList`, `if`, and `endif`.

## 🛠️ AST Structure

The `IniDocument` consists of multiple `Section` objects, each containing a list of `IniItem` variants:

- `Pair { key, value }`
- `Command { command, args }`
- `Comment(String)`

This structure allows `logic_weaver` to perform complex transformations while preserving user comments and formatting.

## 🔧 IniPatcher

The `IniPatcher` trait provides a high-level API for modifying INI files programmatically:

- **Set Value**: `doc.set_value("Section", "Key", "Value")` (Creates section if missing).
- **Patch Config**: Apply a map of `Section/Key` -> `Value` pairs.
- **Proxy Chaining**: Automatically configures `[Import]` sections for ReShade integration.

---
[Next: Logic Weaver](logic-weaver.md) | [Documentation Home](../index.md)
