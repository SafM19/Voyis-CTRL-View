const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  fetchImage: () => ipcRenderer.invoke('fetch-image')
});