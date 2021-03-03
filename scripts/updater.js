const { autoUpdater } = require("electron-updater");
autoUpdater.logger = require("electron-log");

autoUpdater.logger.transports.file.level = "info";

autoUpdater.autoDownload = false;

module.exports = () => {
  //check for updates
  console.log("Checking for updates");
  autoUpdater.checkForUpdates();

  autoUpdater.on("update-available", () => {
    console.log("update available");
    notification("update", "Update Available downloading now...");
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on("update-downloaded", () => {
    notification("update", "Updated downloaded, Reset app.");
  });
};
