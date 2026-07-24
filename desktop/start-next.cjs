const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const root = path.join(__dirname, "..");
const marker = path.join(root, ".desktop-build", "current-next.txt");
const nextRoot = fs.readFileSync(marker, "utf8").trim();

function canUsePort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function findPort(startAt) {
  for (let port = startAt; port < startAt + 50; port += 1) {
    if (await canUsePort(port)) return port;
  }
  throw new Error(`No free port found from ${startAt} to ${startAt + 49}`);
}

async function main() {
  const port = await findPort(Number(process.env.PORT) || 3000);
  process.env.PORT = String(port);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.APP_URL = `http://127.0.0.1:${port}`;
  process.chdir(nextRoot);
  console.log(`Starting Achievd at ${process.env.APP_URL}`);
  require(path.join(nextRoot, "server.js"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
