import { ipcRenderer, contextBridge } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  openExcelDialog: () => ipcRenderer.invoke('dialog:openExcelFile'),
  isElectron: true,
});
