const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.join(__dirname, "..");
const logsDir = path.join(root, "logs");
const port = process.env.PORT || "3000";
const appUrl = `http://127.0.0.1:${port}`;
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const electronCli = path.join(root, "node_modules", "electron", "cli.js");

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replace(".", "-");
}

if (process.env.AC_DESKTOP_DEV_CHILD !== "1") {
  fs.mkdirSync(logsDir, { recursive: true });
  const logPath = path.join(logsDir, `desktop-dev-${timestamp()}.log`);
  const out = fs.openSync(logPath, "a");
  const child = spawn(process.execPath, [__filename], {
    cwd: root,
    detached: true,
    env: {
      ...process.env,
      AC_DESKTOP_DEV_CHILD: "1",
      AC_DESKTOP_DEV_LOG: logPath,
    },
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  child.unref();
  console.log(`Achievd started. Log: ${logPath}`);
  process.exit(0);
}

function spawnProcess(command, args, env = {}) {
  return spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
    windowsHide: true,
  });
}

function waitFor(url) {
  return new Promise((resolve) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => setTimeout(check, 300));
    };
    check();
  });
}

function isRunning(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log(`[${new Date().toISOString()}] desktop dev starting`);
  let next;
  if (!(await isRunning(appUrl))) {
    next = spawnProcess(
      process.execPath,
      [nextCli, "dev", "--hostname", "127.0.0.1", "--port", port],
      {
        DEMO_MODE: process.env.DEMO_MODE || "true",
        APP_URL: appUrl,
        ACHIEVEMENT_COMPASS_DATA_DIR:
          process.env.ACHIEVEMENT_COMPASS_DATA_DIR ||
          path.join(root, ".local-data"),
        SESSION_SECRET:
          process.env.SESSION_SECRET || "achievd-desktop-dev-secret-value",
      },
    );

    await waitFor(appUrl);
  }

  const electron = spawnProcess(process.execPath, [electronCli, "."], {
    APP_URL: appUrl,
    DEMO_MODE: process.env.DEMO_MODE || "true",
  });

  electron.on("exit", (code) => {
    console.log(`[${new Date().toISOString()}] electron exited ${code ?? 0}`);
    next?.kill();
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
