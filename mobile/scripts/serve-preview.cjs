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
/**
 * Resolves a path against Expo Router's dynamic routes, the way a static host
 * rewrite would: /admin/r/products/prod_1 falls back to the exported
 * admin/r/[resource]/[id].html template, which then reads the real URL.
 * A literal folder is always preferred, and the search backtracks so a partly
 * literal path can still land on a parameterised page.
 */
function dynamicRoute(pathname) {
  const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
  const isDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();
  const parameterNames = (dir) => {
    try {
      return [
        ...new Set(
          fs
            .readdirSync(dir)
            .filter((entry) => entry.startsWith("["))
            .map((entry) => entry.replace(/\.html$/, "")),
        ),
      ];
    } catch {
      return [];
    }
  };

  const resolve = (dir, segments) => {
    const [segment, ...rest] = segments;
    if (segment === undefined) {
      const index = path.join(dir, "index.html");
      return isFile(index) ? index : null;
    }
    for (const name of [segment, ...parameterNames(dir)]) {
      if (rest.length === 0) {
        const page = path.join(dir, `${name}.html`);
        if (isFile(page)) return page;
        const nested = path.join(dir, name, "index.html");
        if (isFile(nested)) return nested;
        continue;
      }
      const child = path.join(dir, name);
      if (!isDir(child)) continue;
      const found = resolve(child, rest);
      if (found) return found;
    }
    return null;
  };

  return resolve(root, pathname.split("/").filter(Boolean));
}

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
      const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
      // Nested routes such as /admin export as admin/index.html, which is what
      // a static host serves for the bare path.
      const candidates =
        pathname === "/"
          ? [path.join(root, "index.html")]
          : [
              requested,
              requested + ".html",
              path.join(requested, "index.html"),
            ];
      const file = candidates.find(isFile) || dynamicRoute(pathname);
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
