import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    title: 'نظام إدارة ومراقبة الحضور والغياب - Desktop Attendance Management',
    width: 1380,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handler for Native Windows File Picker
ipcMain.handle('dialog:openExcelFile', async () => {
  if (!win) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'اختر تقرير إكسل اليومي للحضور والغياب',
    filters: [
      { name: 'ملفات إكسل والجداول (Excel & CSV)', extensions: ['xlsx', 'xls', 'csv'] },
      { name: 'جميع الملفات', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return filePaths[0];
});

app.whenReady().then(createWindow);
