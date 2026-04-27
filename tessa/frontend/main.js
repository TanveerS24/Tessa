/**

 * Electron Main Process

 * Entry point for the Tessa desktop application

 */



const { app, BrowserWindow } = require('electron');

const path = require('path');



// Keep a global reference of the window object

let mainWindow;



function createWindow() {

  // Create the browser window

  mainWindow = new BrowserWindow({

    width: 900,

    height: 700,

    minWidth: 500,

    minHeight: 400,

    webPreferences: {

      nodeIntegration: true,

      contextIsolation: false,

      preload: path.join(__dirname, 'preload.js')

    },

    titleBarStyle: 'default',

    show: false, // Don't show until ready

    backgroundColor: '#1a1a2e',

  });



  // Load the app

  const isDev = process.env.NODE_ENV === 'development';

  

  if (isDev) {

    // In development, load from React dev server

    mainWindow.loadURL('http://localhost:3000');

    // Open DevTools

    mainWindow.webContents.openDevTools();

  } else {

    // In production, load from build folder

    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));

  }



  // Show window when ready to prevent visual flash

  mainWindow.once('ready-to-show', () => {

    mainWindow.show();

  });



  // Emitted when the window is closed

  mainWindow.on('closed', () => {

    mainWindow = null;

  });

}



// This method will be called when Electron has finished initialization

app.whenReady().then(createWindow);



// Quit when all windows are closed

app.on('window-all-closed', () => {

  // On macOS, applications keep their menu bar active until Cmd+Q

  if (process.platform !== 'darwin') {

    app.quit();

  }

});



app.on('activate', () => {

  // On macOS, re-create a window when dock icon is clicked

  if (mainWindow === null) {

    createWindow();

  }

});



// Security: Prevent new window creation

app.on('web-contents-created', (event, contents) => {

  contents.on('new-window', (event, navigationUrl) => {

    event.preventDefault();

  });

});

