const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Add any Electron APIs you want to expose to the renderer here
  // For now, we'll keep it simple
  platform: process.platform,
});
