# Logic Weaver

`logic_weaver` is the brain of YAGO's modding capabilities.

## 🧬 Logic Merging

To allow multiple mods to target the same character, `logic_weaver` performs **Namespacing**:

- **Variable Renaming**: `$local_var` becomes `$local_var_{UUID}`.
- **Logic Gates**: `[TextureOverride]` blocks are wrapped in `if` commands:
  ```ini
  if $final_id == {UUID}
      ...
  endif
  ```
  This is constructed using the `Command` variant in the AST (`command: "if", args: ["$final_id == ..."]`).

## 🔨 DXBC Patching (Advanced)

The most complex feature of `logic_weaver` is solving "Hash Hell" through Buffer Re-indexing:

1. **Stride Detection**: Parses `.fmt` files.
2. **Register Identification**: Parses `.asm` (Shader Assembly).
3. **Slot Rewriting**: If two mods target `vb0`, `logic_weaver` rewrites Mod B to use `vb1` automatically.

---
[Next: Contribution Guide](contribution.md) | [Documentation Home](../index.md)
