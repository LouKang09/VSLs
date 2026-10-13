const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400); response.end("Bad request"); return; }
  const allowed = new Set(["/","/index.html","/styles.css","/script.js","/favicon.svg","/robots.txt"]);
  if (!allowed.has(pathname)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const filepath = path.join(root, pathname === "/" ? "index.html" : pathname.slice(1));
  fs.readFile(filepath, (error, buffer) => {
    if (error) { response.writeHead(404); response.end("Not found"); return; }
    response.writeHead(200, {
      "Content-Type": mime[path.extname(filepath)] || "application/octet-stream",
      "Cache-Control": pathname === "/" || pathname === "/index.html" ? "no-cache" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : buffer);
  });
});
server.listen(port, "0.0.0.0", () => console.log(`VSLs listening on port ${port}`));
