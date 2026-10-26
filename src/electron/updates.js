function createUpdates({ updater, version, enabled, onStatus = () => {}, confirmInstall, beforeInstall }) {
  let status = { enabled, currentVersion: version, latestVersion: version, updateAvailable: false, phase: "idle" };
  let checking;
  let downloading;
  let installing = false;
  const setStatus = (values) => { status = { ...status, ...values }; onStatus({ ...status }); };
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowDowngrade = false;
  updater.on("update-available", (info) => setStatus({ latestVersion: info.version, updateAvailable: true, phase: "available", error: "" }));
  updater.on("update-not-available", (info) => setStatus({ latestVersion: info.version, updateAvailable: false, phase: "current", error: "" }));
  updater.on("download-progress", (progress) => setStatus({ phase: "downloading", percent: Math.floor(progress.percent) }));
  updater.on("update-downloaded", (info) => setStatus({ latestVersion: info.version, phase: "downloaded", percent: 100, error: "" }));
  updater.on("error", (error) => setStatus({ phase: "error", error: error.message }));
  return {
    status: () => ({ ...status }),
    async check() {
      if (!enabled || downloading || status.phase === "downloaded") return { ...status };
      if (!checking) checking = (async () => {
        setStatus({ phase: "checking", error: "" });
        try { await updater.checkForUpdates(); return { ...status }; }
        catch (error) { setStatus({ phase: "error", error: error.message }); throw error; }
        finally { checking = null; }
      })();
      return checking;
    },
    async download() {
      if (!enabled || !status.updateAvailable) throw new Error("Nenhuma atualizacao disponivel.");
      if (status.phase === "downloaded") return { ...status };
      if (!downloading) downloading = (async () => {
        setStatus({ phase: "downloading", percent: 0, error: "" });
        try { await updater.downloadUpdate(); return { ...status }; }
        catch (error) { setStatus({ phase: "error", error: error.message }); throw error; }
        finally { downloading = null; }
      })();
      return downloading;
    },
    async install() {
      if (!enabled || status.phase !== "downloaded") throw new Error("Baixe a atualizacao antes de instalar.");
      if (installing) return false;
      installing = true;
      try {
        if (!(await confirmInstall())) return false;
        await beforeInstall();
        updater.quitAndInstall(false, true);
        return true;
      } finally { installing = false; }
    },
  };
}

module.exports = { createUpdates };
