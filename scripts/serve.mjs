// Serves dist/ for local preview: node scripts/serve.mjs  → http://localhost:4190
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";

const PORT = Number(process.env.PORT) || 4190;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2" };
const dist = new URL("../dist/", import.meta.url);

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
  if (!path || path.endsWith("/") || path.endsWith("\\")) path += "index.html";
  if (path.includes("..")) return res.writeHead(400).end();
  try {
    const body = await readFile(new URL(path, dist));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
