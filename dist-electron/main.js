import { BrowserWindow as e, app as t, dialog as n, ipcMain as r } from "electron";
import i from "node:path";
import { fileURLToPath as a } from "node:url";
//#region electron/main.ts
var o = i.dirname(a(import.meta.url));
process.env.APP_ROOT = i.join(o, "..");
var s = i.join(process.env.APP_ROOT, "dist-electron"), c = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL ? i.join(process.env.APP_ROOT, "public") : c;
var l = null;
function u() {
	l = new e({
		title: "نظام إدارة ومراقبة الحضور والغياب - Desktop Attendance Management",
		width: 1380,
		height: 900,
		minWidth: 1024,
		minHeight: 700,
		backgroundColor: "#0f172a",
		autoHideMenuBar: !0,
		webPreferences: {
			preload: i.join(o, "preload.js"),
			nodeIntegration: !1,
			contextIsolation: !0
		}
	}), process.env.VITE_DEV_SERVER_URL ? l.loadURL(process.env.VITE_DEV_SERVER_URL) : l.loadFile(i.join(c, "index.html"));
}
t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), l = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && u();
}), r.handle("dialog:openExcelFile", async () => {
	if (!l) return null;
	let { canceled: e, filePaths: t } = await n.showOpenDialog(l, {
		title: "اختر تقرير إكسل اليومي للحضور والغياب",
		filters: [{
			name: "ملفات إكسل والجداول (Excel & CSV)",
			extensions: [
				"xlsx",
				"xls",
				"csv"
			]
		}, {
			name: "جميع الملفات",
			extensions: ["*"]
		}],
		properties: ["openFile"]
	});
	return e || t.length === 0 ? null : t[0];
}), t.whenReady().then(u);
//#endregion
export { s as MAIN_DIST, c as RENDERER_DIST };
