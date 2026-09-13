// Local-only server for the exported web build and repeatable browser verification.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..", process.env.PREVIEW_ROOT || "dist");
const port = Number(process.env.PORT || 8082);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
http
  .createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const requested = path.resolve(root, "." + pathname);
      if (requested !== root && !requested.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const candidates =
        pathname === "/"
          ? [path.join(root, "index.html")]
          : [requested, requested + ".html"];
      const file = candidates.find(
        (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
      );
      if (!file) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(400).end("Bad request");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Expo export preview: http://localhost:${port}`),
  );
