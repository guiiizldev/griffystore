const { app, BrowserWindow, dialog, shell } = require("electron");
const fs = require("fs");
const http = require("http");
const path = require("path");

let mainWindow;
let server;
let reusedExistingServer = false;

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
}

if (gotLock) app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return env;
      const index = trimmed.indexOf("=");
      env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
      return env;
    }, {});
}

function ensureConfigFile(configPath) {
  const projectEnvPath = path.join(__dirname, "../../.env");
  const examplePath = path.join(__dirname, "../../.env.example");
  const sourcePath = fs.existsSync(projectEnvPath) ? projectEnvPath : examplePath;
  if (!fs.existsSync(sourcePath)) return;

  if (!fs.existsSync(configPath)) {
    fs.copyFileSync(sourcePath, configPath);
    return;
  }

  const current = readEnvFile(configPath);
  const source = readEnvFile(sourcePath);
  const currentIsOldLocalDefault = ["", "127.0.0.1", "localhost"].includes(current.MYSQL_HOST || "") && ["", "root"].includes(current.MYSQL_USER || "");
  const sourceUsesRemote = source.MYSQL_HOST && !["127.0.0.1", "localhost"].includes(source.MYSQL_HOST);
  if (currentIsOldLocalDefault && sourceUsesRemote) {
    fs.copyFileSync(sourcePath, configPath);
    return;
  }

  const missingKeys = Object.keys(source).filter((key) => !(key in current));
  if (missingKeys.length) {
    const lines = missingKeys.map((key) => `${key}=${source[key]}`);
    fs.appendFileSync(configPath, `\n${lines.join("\n")}\n`, "utf8");
  }
}

function applyEnv(env) {
  Object.entries(env).forEach(([key, value]) => {
    if (!(key in process.env)) process.env[key] = value;
  });
}

function normalizeApiBase(value) {
  const clean = String(value || "").trim().replace(/\/+$/, "");
  if (!clean) return "";
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

async function createWindow() {
  const configDir = app.getPath("userData");
  const configPath = path.join(configDir, ".env");
  process.env.GRIFFY_CONFIG_DIR = configDir;
  ensureConfigFile(configPath);
  applyEnv(readEnvFile(configPath));

  const remoteApiBase = normalizeApiBase(process.env.GRIFFY_API_BASE || process.env.API_BASE_URL || process.env.REMOTE_API_URL);
  const port = Number(process.env.APP_PORT || 3789);
  if (!remoteApiBase) {
    const { startServer } = require("../server/api");
    try {
      server = await startServer(port);
    } catch (error) {
      if (error.code === "EADDRINUSE" && (await isLocalApiAlive(port))) {
        reusedExistingServer = true;
        server = null;
      } else {
        throw error;
      }
    }
  }

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "Griffy Store",
    icon: path.join(__dirname, "../../assets/griffy-icon.ico"),
    backgroundColor: "#f4f6f8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadFile(path.join(__dirname, "../../index.html"), remoteApiBase ? { query: { apiBase: remoteApiBase } } : undefined);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function isLocalApiAlive(port) {
  return new Promise((resolve) => {
    const request = http.get({ host: "127.0.0.1", port, path: "/api/health", timeout: 1200 }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

async function closeLocalServer() {
  if (!server || reusedExistingServer) return;
  const currentServer = server;
  server = null;
  await currentServer.close();
}

if (gotLock) app.whenReady().then(createWindow).catch((error) => {
  let message = error.message;
  if (error.code === "EADDRINUSE") {
    message = "A API local do Griffy Store ficou presa em segundo plano e nao respondeu. Feche processos duplicados do Griffy Store pelo Gerenciador de Tarefas e abra novamente.";
  }
  if (error.code === "ECONNREFUSED" && String(error.message).includes("127.0.0.1:3306")) {
    message = "O sistema esta tentando usar MySQL local (127.0.0.1), mas ele nao esta aberto. Atualize a configuracao para a VPS ou inicie o MySQL pelo XAMPP.";
  }
  dialog.showErrorBox("Erro ao iniciar Griffy Store", message);
  app.quit();
});

if (gotLock) app.on("window-all-closed", async () => {
  await closeLocalServer();
  if (process.platform !== "darwin") app.quit();
});

if (gotLock) app.on("before-quit", () => {
  closeLocalServer().catch(() => {});
});

if (gotLock) app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
