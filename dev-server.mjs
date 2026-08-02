import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const root = process.cwd();
const port = Number(process.env.PORT || 4173);

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const target = path.resolve(root, relative);
  if (!target.startsWith(root)) return response.writeHead(403).end("Forbidden");
  fs.readFile(target, (error, data) => {
    if (error) {
      response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      return fs.createReadStream(path.join(root, "404.html")).pipe(response);
    }
    response.writeHead(200, { "content-type": `${types[path.extname(target)] || "application/octet-stream"}; charset=utf-8` });
    response.end(data);
  });
}).listen(port, () => console.log(`SipArena draait op http://localhost:${port}`));
