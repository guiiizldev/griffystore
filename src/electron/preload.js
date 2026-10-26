const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("griffyUpdates", {
  check: () => ipcRenderer.invoke("griffy:updates:check"),
  download: () => ipcRenderer.invoke("griffy:updates:download"),
  install: () => ipcRenderer.invoke("griffy:updates:install"),
  onStatus(callback) {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("griffy:updates:status", listener);
    return () => ipcRenderer.removeListener("griffy:updates:status", listener);
  },
});
