const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('muze', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  prepareAudio: (filePath) => ipcRenderer.invoke('prepare-audio', filePath),
});
