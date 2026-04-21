/**
 * Electron Preload Script
 * Provides a bridge between the main process and renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Platform info
  getPlatform: () => process.platform,
  
  // Environment
  isDev: () => process.env.NODE_ENV === 'development',
});

// For non-context-isolated mode (development simplicity)
// You can use this in main.js by setting contextIsolation: false
if (typeof window !== 'undefined') {
  window.electron = {
    platform: process.platform,
    isDev: process.env.NODE_ENV === 'development',
  };
}
