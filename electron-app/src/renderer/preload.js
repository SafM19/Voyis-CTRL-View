const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // Fetch all images
  fetchAllImages: () => ipcRenderer.invoke('fetchAllImages'),

  // Fetch images filtered by filetype
  fetchImagesFiltered: (filetype) => ipcRenderer.invoke('fetchImagesFiltered', filetype),

  // Save cropped image
  saveCroppedImage: ({ base64, filename }) =>
    ipcRenderer.invoke('save-cropped-image', { base64, filename }),

  // Get single image by ID
  getImageById: (id) => ipcRenderer.invoke('getImageById', id),

  // Batch insert from folder config
  runBatchInsert: () => ipcRenderer.invoke('run-batch-insert'),

  // user select folder to export to
  chooseExportFolder: () => ipcRenderer.invoke('export:chooseFolder'),

  // export all images on screen
  exportImages: (data) => ipcRenderer.invoke('export:images', data),

  // Electron logs
  onMainLog: (callback) => ipcRenderer.on('log-from-main', (event, message) => callback(message)),

  // Checking for duplicates
  checkDuplicate: (filename) => ipcRenderer.invoke('check-duplicate', filename),

  syncFromServer: () => ipcRenderer.invoke("sync-from-server")
});
