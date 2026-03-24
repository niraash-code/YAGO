import { serve, build } from "bun";
import { join } from "path";
import { readFileSync, existsSync, watch } from "fs";
import { reactCompilerPlugin } from "./react_compiler_plugin";

const PORT = 1420;
const sockets = new Set<any>();

console.log(`📡 Protocol Velocity: Dev Server launching on port ${PORT}...`);

async function rebuild() {
  const result = await build({
    entrypoints: [join(import.meta.dir, "src", "index.tsx")],
    outdir: join(import.meta.dir, "dist"),
    target: "browser",
    naming: "index.js",
    sourcemap: "inline",
    plugins: [reactCompilerPlugin],
  });
  
  if (result.success) {
    console.log("✅ Diamond Rebuilt Successfully");
    // Notify all connected clients to reload
    for (const socket of sockets) {
      socket.send("reload");
    }
  } else {
    console.error("❌ Rebuild Failed:", result.logs);
  }
  return result.success;
}

// Initial build
await rebuild();

// Compile CSS initially and watch it
const tailwindProcess = Bun.spawn(["bun", "x", "tailwindcss", "-i", "./src/index.css", "-o", "./dist/index.css", "--watch"], {
  cwd: import.meta.dir,
  stdout: "inherit"
});

// Watch source files for changes
const watcher = watch(join(import.meta.dir, "src"), { recursive: true }, async (event, filename) => {
  console.log(`🔄 Change detected: ${filename}`);
  await rebuild();
});

const server = serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;

    // WebSocket upgrade for reload signaling
    if (server.upgrade(req)) {
      return;
    }

    // Serve dist index.js
    if (path === "/index.js") {
      return new Response(Bun.file(join(import.meta.dir, "dist/index.js")));
    }

    // Serve HTML with injected reload script
    if (path === "/" || path === "/index.html") {
      let html = readFileSync(join(import.meta.dir, "index.html"), "utf-8");
      html = html.replace("/src/index.tsx", "/index.js");
      html = html.replace("/src/index.css", "/dist/index.css");
      
      // Inject Live Reload Script
      const reloadScript = `
        <script>
          const socket = new WebSocket('ws://' + window.location.host);
          socket.onmessage = (event) => {
            if (event.data === 'reload') {
              console.log('🔄 ReX Command: Reloading UI...');
              window.location.reload();
            }
          };
          socket.onclose = () => {
            console.warn('📡 Dev Server Disconnected. Retrying in 2s...');
            setTimeout(() => window.location.reload(), 2000);
          };
        </script>
      `;
      html = html.replace("</body>", `${reloadScript}</body>`);
      
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    // Fallback static serving
    const distPath = join(import.meta.dir, "dist", path);
    if (existsSync(distPath)) return new Response(Bun.file(distPath));

    const srcPath = join(import.meta.dir, path);
    if (existsSync(srcPath)) return new Response(Bun.file(srcPath));

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      sockets.add(ws);
    },
    message(ws, message) {},
    close(ws) {
      sockets.delete(ws);
    },
  },
});

console.log(`🚀 Radiant Dev Environment Active: http://localhost:${PORT}`);

// Cleanup on exit
process.on("SIGINT", () => {
  watcher.close();
  tailwindProcess.kill();
  process.exit();
});