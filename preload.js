const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rmgAPI', {
  getLmmsPath: (customPath) => ipcRenderer.invoke('get-lmms-path', customPath),
  selectLmmsPath: () => ipcRenderer.invoke('select-lmms-path'),
  launchLMMS: (payload) => ipcRenderer.invoke('launch-lmms', payload),
  saveFile: (payload, defaultName, type) => {
    if (payload && typeof payload === 'object' && !ArrayBuffer.isView(payload) && !Buffer.isBuffer(payload) && payload.data !== undefined) {
      return ipcRenderer.invoke('save-file', payload);
    }
    return ipcRenderer.invoke('save-file', { data: payload, defaultName, type });
  }
});
