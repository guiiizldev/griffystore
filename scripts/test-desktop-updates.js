const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createUpdates } = require("../src/electron/updates");

(async () => {
  const updater = new EventEmitter();
  let checks = 0, downloads = 0, installs = 0, closed = 0;
  let finishCheck, finishDownload;
  let consent = false;
  updater.checkForUpdates = async () => { checks++; await new Promise(resolve => { finishCheck = resolve; }); updater.emit("update-available", { version: "0.2.2" }); };
  updater.downloadUpdate = async () => { downloads++; await new Promise(resolve => { finishDownload = resolve; }); updater.emit("update-downloaded", { version: "0.2.2" }); };
  updater.quitAndInstall = () => { installs++; };
  const updates = createUpdates({ updater, version: "0.2.1", enabled: true,
    confirmInstall: async () => consent, beforeInstall: async () => { closed++; } });
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);
  await assert.rejects(updates.install());
  const checksInFlight = [updates.check(), updates.check()];
  assert.equal(checks, 1); finishCheck(); await Promise.all(checksInFlight);
  assert.equal(updates.status().updateAvailable, true);
  const downloadsInFlight = [updates.download(), updates.download()];
  assert.equal(downloads, 1);
  updater.emit("download-progress", { percent: 50.9 });
  assert.equal(updates.status().percent, 50);
  finishDownload(); await Promise.all(downloadsInFlight);
  await updates.download(); assert.equal(downloads, 1);
  assert.equal(await updates.install(), false); assert.equal(installs, 0); assert.equal(closed, 0);
  consent = true;
  await updates.install(); assert.equal(installs, 1); assert.equal(closed, 1);
  updater.emit("error", new Error("checksum mismatch"));
  assert.equal(updates.status().phase, "error");
  await assert.rejects(updates.install());
  const disabled = createUpdates({ updater: new EventEmitter(), version: "0.2.1", enabled: false });
  assert.equal((await disabled.check()).enabled, false);
  await assert.rejects(disabled.download());
  console.log("Desktop updates: single check/download, progress, explicit install consent, failure handling and disabled development passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
