// electron/main.js

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let backendProcess = null;

function startBackendServer() {
  const isPackaged = app.isPackaged;
  const backendExe = isPackaged
    ? path.join(process.resourcesPath, 'backend', 'dist', process.platform === 'win32' ? 'main.exe' : 'main')
    : path.join(__dirname, '..', 'backend', 'dist', process.platform === 'win32' ? 'main.exe' : 'main');
  console.log('🛠️ Attempting to start backend from:', backendExe);

  try {
    backendProcess = spawn(backendExe, [], { cwd: path.dirname(backendExe) });

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`[Backend] Process exited with code ${code}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: false }
  });

  // ✅ Loads the built React frontend from /dist
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  // mainWindow.webContents.openDevTools();
  console.log('🌐 Frontend loaded from dist/index.html');
}

app.whenReady().then(() => {
  startBackendServer();  // ✅ Starts FastAPI backend
  createWindow();        // ✅ Loads frontend
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
