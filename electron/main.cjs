const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let serverProcess = null;
let mainWindow = null;

function startServer() {
  // Only start the server in production. In dev, concurrently handles it.
  if (process.env.NODE_ENV !== 'development') {
    const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
    console.log('[Electron] Starting production Express server from:', serverPath);
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, NODE_ENV: 'production', PORT: '3000' }
    });
    
    serverProcess.on('error', (err) => {
      console.error('[Electron] Failed to start Express server:', err);
    });
    
    serverProcess.on('exit', (code, signal) => {
      console.log(`[Electron] Express server exited with code ${code} and signal ${signal}`);
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'GERS - Government Employee Record System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  // In development, load localhost. In production, wait a bit and load localhost.
  const url = 'http://localhost:3000';
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(url);
  } else {
    // Give the server 1.5 seconds to start before loading the URL
    setTimeout(() => {
      mainWindow.loadURL(url).catch(err => {
        console.error('[Electron] Failed to load URL:', err);
        // Retry
        setTimeout(() => mainWindow.loadURL(url), 1000);
      });
    }, 1500);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
