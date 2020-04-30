// Import parts of electron to use
require('update-electron-app')();

const { shell } = require('electron');
const {
  ipcMain, app, BrowserWindow, Menu, autoUpdater, dialog,
} = require('electron');
const path = require('path');
const url = require('url');
const sharp = require('sharp');
const fetch = require('fetch-base64');
const fs = require('fs');
const localize = require('./src/assets/data/lang');
// const getLocale = require('./src/utils/Locale');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
// Keep a reference for dev mode
let dev = false;
if (process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath)) {
  dev = true;
}
if (!dev) {
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60000);
  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    const dialogOpts = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'New version downloaded. Reboot the app to update.',
    };
    dialog.showMessageBox(dialogOpts).then((returnValue) => {
      if (returnValue.response === 0) autoUpdater.quitAndInstall();
    });
  });
  autoUpdater.on('error', (message) => {
    console.error('There was a problem updating the application');
    console.error(message);
  });
}

let currentLang = Intl.DateTimeFormat().resolvedOptions().locale;
function µ(key) {
  return (localize(currentLang, key));
}
function onLangChanged(lang) {
  mainWindow.webContents.send('onLangChanged', lang);
  currentLang = lang;
  const newMenu = Menu.buildFromTemplate(template());
  Menu.setApplicationMenu(newMenu);
}

const template = () => ([
  {
    label: µ('file'),
    submenu: [
      {
        label: µ('open'),
        click: () => mainWindow.webContents.send('open'),
      },
      {
        type: 'separator',
      },
      {
        role: µ('quit'),
      },
    ],
  },
  {
    label: µ('language'),
    submenu: [
      {
        label: 'Français',
        click: () => onLangChanged('fr'),
      },
      {
        label: 'English',
        click: () => onLangChanged('en'),
      },
    ],
  },
  {
    label: µ('help'),
    submenu: [
      {
        label: µ('about'),
        click: () => shell.openExternal('https://tsantza.kevincastejon.fr'),
      },
    ],
  },
]);

const menu = Menu.buildFromTemplate(template());
Menu.setApplicationMenu(menu);


async function unlink(filePath) {
  return new Promise((res, rej) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        rej(err);
      } else {
        res();
      }
    });
  });
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    title: 'Tsantza',
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // and load the index.html of the app.
  let indexPath;
  if (dev && process.argv.indexOf('--noDevServer') === -1) {
    indexPath = url.format({
      protocol: 'http:',
      host: 'localhost:8080',
      pathname: 'index.html',
      slashes: true,
    });
  } else {
    indexPath = url.format({
      protocol: 'file:',
      pathname: path.join(__dirname, 'output', 'index.html'),
      slashes: true,
    });
  }
  mainWindow.loadURL(indexPath);

  // Don't show until we are ready and loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Open the DevTools automatically if developing
    if (dev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
  ipcMain.on('onAddImages', async (e, files) => {
    const images = [];
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const base64 = (await fetch.local(file))[1];
        images.push({ path: file, base64 });
        e.sender.send('onAddProgress', (i / files.length) * 100);
      }
      e.sender.send('onImagesAdded', images);
    } catch (err) {
      e.sender.send('onError', err.message);
    }
  });
  ipcMain.on('onResize', async (e, images, maxWidth, maxHeight, outputType, outputPath, conversion) => {
    try {
      for (let i = 0; i < images.length; i += 1) {
        const img = await sharp(Buffer.from(images[i].base64.split(',')[1], 'base64'), { failOnError: false });
        const resizeOpt = { height: maxHeight, width: maxWidth, fit: 'inside' };
        if (maxWidth) {
          await img.resize(resizeOpt);
        }
        if (conversion === 'jpeg') {
          await img.jpeg();
        } else if (conversion === 'png') {
          await img.png();
        } else if (conversion === 'webp') {
          await img.webp();
        }
        if (outputType === 'folder') {
          await img.toFile(path.resolve(outputPath, conversion === 'none' ? path.basename(images[i].path) : `${path.basename(images[i].path, path.extname(images[i].path))}.${conversion}`));
        } else if (outputType === 'original') {
          await unlink(images[i].path);
          await img.toFile(path.resolve(
            path.dirname(images[i].path),
            conversion === 'none' ? path.basename(images[i].path) : `${path.basename(images[i].path, path.extname(images[i].path))}.${conversion}`,
          ));
        }
        e.sender.send('onResizeProgress', (i / images.length) * 100);
      }
      e.sender.send('onResized');
    } catch (err) {
      const errMsg = err.message.includes('unable to open for write')
       || err.message.includes('EPERM')
        ? 'Erreur de permission : essayez de lancer l\'application en tant qu\'administrateur'
        : err.message;
      e.sender.send('onError', errMsg);
    }
  });
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
