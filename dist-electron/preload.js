import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
e.exposeInMainWorld("electronAPI", {
	openExcelDialog: () => t.invoke("dialog:openExcelFile"),
	isElectron: !0
});
//#endregion
export {};
