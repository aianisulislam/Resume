import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const inputFile = process.argv[2] ?? "resume.html";
const outputFile = process.argv[3] ?? "resume.pdf";
const port = 4173;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const requestPath = request.url === "/" ? `/${inputFile}` : request.url;
  const filePath = resolve(rootDir, `.${requestPath}`);

  if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
  });

  createReadStream(filePath).pipe(response);
});

server.listen(port, async () => {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/${inputFile}`, {
      waitUntil: "networkidle",
    });

    await page.pdf({
      path: join(rootDir, outputFile),
      format: "Letter",
      landscape: false,
      printBackground: false,
      displayHeaderFooter: false,
      margin: {
        top: "0.25in",
        bottom: "0.25in",
        left: "0.5in",
        right: "0.5in",
      },
    });
  } finally {
    await browser.close();
    server.close();
  }
});
