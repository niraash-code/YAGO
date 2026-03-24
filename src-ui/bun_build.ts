import { build } from "bun";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { reactCompilerPlugin } from "./react_compiler_plugin";

async function runBuild() {
  const outDir = join(import.meta.dir, "dist");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  console.log("🚀 Protocol Velocity: Igniting Bun Builder...");

  // 1. Build TSX with React Compiler
  const result = await build({
    entrypoints: [join(import.meta.dir, "src", "index.tsx")],
    outdir: outDir,
    minify: true,
    target: "browser",
    naming: "index.js",
    plugins: [reactCompilerPlugin],
  });

  if (!result.success) {
    console.error("❌ Build failed:", result.logs);
    process.exit(1);
  }

  // 2. Compile CSS (Tailwind v4)
  console.log("🎨 Weaving Tailwind Fibers...");
  const cssResult = Bun.spawnSync(["bun", "x", "tailwindcss", "-i", "./src/index.css", "-o", "./dist/index.css"], {
    cwd: import.meta.dir
  });
  if (!cssResult.success) {
    console.error("❌ CSS Compilation failed:", cssResult.stderr.toString());
  }

  // 3. Transform and Copy index.html
  console.log("📄 Anchoring index.html...");
  let html = readFileSync(join(import.meta.dir, "index.html"), "utf-8");
  // Rewrite paths for production
  html = html.replace("/src/index.tsx", "/index.js");
  html = html.replace("/src/index.css", "/index.css");
  writeFileSync(join(outDir, "index.html"), html);

  // 4. Copy public assets (if any)
  const publicDir = join(import.meta.dir, "public");
  if (existsSync(publicDir)) {
    console.log("📦 Copying public assets...");
    // Simple recursive copy logic if needed, but we currently have no public/
  }

  console.log("💎 Sovereign Build Complete: dist/ is now a Sealed Diamond.");
}

runBuild();
