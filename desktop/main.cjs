const { app, BrowserWindow, Menu, shell, dialog, Tray } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { randomBytes } = require("node:crypto");

let nextProcess;
let logFile;
let mainWindow;
let tray;
let isQuitting = false;

function loadingHtml(progress = 8) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Achievd</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #080b10;
        color: #f4f7fb;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(420px, calc(100vw - 48px));
      }
      .brand {
        color: #64d8ff;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .14em;
        margin-bottom: 14px;
        text-transform: uppercase;
      }
      h1 {
        font-size: 28px;
        line-height: 1.1;
        margin: 0 0 22px;
      }
      .row {
        align-items: center;
        display: flex;
        gap: 14px;
      }
      .spinner {
        animation: spin 900ms linear infinite;
        border: 3px solid rgba(255,255,255,.16);
        border-top-color: #64d8ff;
        border-radius: 999px;
        height: 34px;
        width: 34px;
      }
      .percent {
        font-variant-numeric: tabular-nums;
        font-size: 24px;
        font-weight: 800;
      }
      .track {
        background: rgba(255,255,255,.1);
        border-radius: 999px;
        height: 10px;
        margin-top: 18px;
        overflow: hidden;
      }
      .bar {
        background: linear-gradient(90deg, #64d8ff, #9be15d);
        height: 100%;
        transition: width 180ms ease;
        width: ${progress}%;
      }
      p {
        color: #aeb9c8;
        font-size: 14px;
        line-height: 1.5;
        margin: 16px 0 0;
      }
      @media (prefers-reduced-motion: reduce) {
        .spinner { animation: none; }
        .bar { transition: none; }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <main>
      <div class="brand">Achievd</div>
      <h1>Starting your achievement hub</h1>
      <div class="row">
        <div class="spinner" aria-hidden="true"></div>
        <div class="percent" id="percent">${progress}%</div>
      </div>
      <div class="track" aria-hidden="true"><div class="bar" id="bar"></div></div>
      <p id="message">Preparing the local app server...</p>
    </main>
  </body>
</html>`;
}

function setLoadingProgress(window, progress, message) {
  if (window.isDestroyed()) return;
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  window.webContents
    .executeJavaScript(
      `{
  const percent = document.getElementById("percent");
  const bar = document.getElementById("bar");
  const message = document.getElementById("message");
  if (percent && bar && message) {
    percent.textContent = "${safeProgress}%";
    bar.style.width = "${safeProgress}%";
    message.textContent = ${JSON.stringify(message)};
  }
}`,
    )
    .catch(() => {});
}

function log(message) {
  if (!logFile) return;
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function waitFor(url, timeoutMs = 60000, onProgress = () => {}) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        onProgress(96, "Opening the interface...");
        resolve();
      });
      request.on("error", () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        onProgress(
          20 + Math.min(70, Math.floor((elapsed / timeoutMs) * 70)),
          "Starting the local app server...",
        );
        setTimeout(check, 300);
      });
    };
    check();
  });
}

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;

  const secretPath = path.join(app.getPath("userData"), "session-secret");
  try {
    return fs.readFileSync(secretPath, "utf8").trim();
  } catch {}

  const secret = randomBytes(32).toString("base64url");
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

async function startNextServer(onProgress = () => {}) {
  if (!app.isPackaged) {
    onProgress(100, "Opening the interface...");
    return process.env.APP_URL || "http://127.0.0.1:3000";
  }

  onProgress(12, "Finding a local port...");
  const port = await getFreePort();
  const appUrl = `http://127.0.0.1:${port}`;
  const nextRoot = path.join(process.resourcesPath, "next");
  const serverPath = path.join(nextRoot, "server.js");
  const nodeModulesPath = path.join(nextRoot, "node_modules");
  logFile = path.join(app.getPath("userData"), "startup.log");
  fs.writeFileSync(logFile, "");
  log(`resourcesPath=${process.resourcesPath}`);
  log(`nextRoot=${nextRoot}`);
  log(`serverPath=${serverPath}`);
  log(`nodeModules=${nodeModulesPath}`);
  log(`url=${appUrl}`);

  const output = fs.openSync(logFile, "a");

  onProgress(18, "Launching the local app server...");
  nextProcess = spawn(process.execPath, [serverPath], {
    cwd: nextRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      APP_URL: appUrl,
      ACHIEVEMENT_COMPASS_DATA_DIR: app.getPath("userData"),
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1024",
      DEMO_MODE: process.env.DEMO_MODE || "true",
      SESSION_SECRET: getSessionSecret(),
    },
    stdio: ["ignore", output, output],
    windowsHide: true,
  });

  nextProcess.on("exit", (code, signal) => {
    log(`next server exited code=${code} signal=${signal}`);
    nextProcess = undefined;
  });

  await waitFor(appUrl, 60000, onProgress);
  return appUrl;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    backgroundColor: "#080b10",
    title: "Achievd",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  window.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml())}`,
  );
  window.webContents.on("page-title-updated", (_event, title) => {
    tray?.setToolTip(title.includes("Syncing") ? title : "Achievd");
  });
  window.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    window.hide();
  });
  window.show();
  window.focus();
  return window;
}

function trayIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "icon.ico")
    : path.join(__dirname, "..", "build", "icon.ico");
}

function createTray() {
  if (tray) return;
  tray = new Tray(trayIconPath());
  tray.setToolTip("Achievd");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show Achievd",
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function attachNavigationGuards(window, appUrl) {
  function isAppUrl(url) {
    try {
      const next = new URL(url);
      const app = new URL(appUrl);
      return (
        next.protocol === app.protocol &&
        next.port === app.port &&
        ["127.0.0.1", "localhost", "::1"].includes(next.hostname)
      );
    } catch {
      return false;
    }
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    shell.openExternal(url);
  });
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  createTray();
  const window = createWindow();
  mainWindow = window;
  try {
    const appUrl = await startNextServer((progress, message) =>
      setLoadingProgress(window, progress, message),
    );
    setLoadingProgress(window, 100, "Ready.");
    attachNavigationGuards(window, appUrl);
    window.loadURL(appUrl);
  } catch (error) {
    dialog.showErrorBox(
      "Achievd failed to start",
      `${error instanceof Error ? error.message : String(error)}${
        logFile ? `\n\nStartup log: ${logFile}` : ""
      }`,
    );
    app.quit();
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createWindow();
      mainWindow = window;
      const appUrl = await startNextServer((progress, message) =>
        setLoadingProgress(window, progress, message),
      );
      attachNavigationGuards(window, appUrl);
      window.loadURL(appUrl);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  nextProcess?.kill();
});
