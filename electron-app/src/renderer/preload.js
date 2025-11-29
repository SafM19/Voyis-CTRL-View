const { contextBridge, ipcRenderer } = require('electron');
console.log("PRELOAD LOADED!");

//exposing functions
contextBridge.exposeInMainWorld('electronAPI', {
  fetchImage: () => ipcRenderer.invoke('fetchImage'),
  getFilePath: (file) => {
    return file.path; 
  },
  runBatchInsert: () => ipcRenderer.invoke("run-batch-insert"),
  fetchAllImages: () => ipcRenderer.invoke('fetchAllImages'),
  saveImage: (data) => ipcRenderer.invoke("save-cropped-image", data),
  fetchImagesFiltered: (filter) => ipcRenderer.invoke("fetchImagesFiltered", filter)
});


