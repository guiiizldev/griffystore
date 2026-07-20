const { app, BrowserWindow, dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;
let server;

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

async function createWindow() {
  const configDir = app.getPath("userData");
  const configPath = path.join(configDir, ".env");
  process.env.GRIFFY_CONFIG_DIR = configDir;
  ensureConfigFile(configPath);

  const { startServer } = require("../server/api");
  const port = Number(process.env.APP_PORT || 3789);
  server = await startServer(port);

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

  await mainWindow.loadFile(path.join(__dirname, "../../index.html"));
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

if (gotLock) app.whenReady().then(createWindow).catch((error) => {
  let message = error.message;
  if (error.code === "EADDRINUSE") {
    message = "O Griffy Store ja esta aberto ou ficou preso em segundo plano. Feche as janelas duplicadas pelo Gerenciador de Tarefas e abra o sistema novamente.";
  }
  if (error.code === "ECONNREFUSED" && String(error.message).includes("127.0.0.1:3306")) {
    message = "O sistema esta tentando usar MySQL local (127.0.0.1), mas ele nao esta aberto. Atualize a configuracao para a VPS ou inicie o MySQL pelo XAMPP.";
  }
  dialog.showErrorBox("Erro ao iniciar Griffy Store", message);
  app.quit();
});

if (gotLock) app.on("window-all-closed", async () => {
  if (server) await server.close();
  if (process.platform !== "darwin") app.quit();
});

if (gotLock) app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
