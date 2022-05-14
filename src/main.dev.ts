/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import console from 'console';
import { initialize, enable } from '@electron/remote/main';
import { MIN_HEIGHT, MIN_WIDTH } from './contant/windowSize';

initialize();

ipcMain.on('selectMainDir', () => {
  dialog
    .showOpenDialog({
      title: '请选择一个文件夹作为数据目录',
      // 默认打开的路径，比如这里默认打开下载文件夹
      defaultPath: app.getPath('desktop'),
      buttonLabel: '选取数据目录',
      properties: ['openDirectory'],
      message: '请选择一个文件夹作为数据目录',
    })
    .then(({ filePaths }) => {
      if (filePaths && filePaths.length > 0) {
        ipcMain.emit('onSelectMainDir', filePaths[0]);
      }
    })
    .catch((e) => {
      console.error('showOpenDialog to selectMainDir error', e);
    });
});

ipcMain.on('selectResource', (ext, openDir) => {
  const extension = ext as unknown as string;
  dialog
    .showOpenDialog({
      title: '请选择源文件',
      defaultPath: openDir,
      buttonLabel: '选择源文件',
      filters: [{ extensions: [extension, extension.toUpperCase()], name: '' }],
      properties: ['openFile'],
      message: '请选择源文件',
    })
    .then(({ filePaths }) => {
      if (filePaths && filePaths.length > 0) {
        ipcMain.emit('onSelectResourceTxT', filePaths[0]);
      }
    })
    .catch((e) => {
      console.error('showOpenDialog to selectResource error', e);
    });
});

ipcMain.on('exitAPP', () => {
  console.log('exitAPP');
  app.quit();
});

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.platform === 'darwin') {
  ipcMain.on('showContollButton', () => {
    if (mainWindow === null) {
      return;
    }
    mainWindow.setWindowButtonVisibility(true);
  });

  ipcMain.on('hideContollButton', () => {
    if (mainWindow === null) {
      return;
    }
    mainWindow.setWindowButtonVisibility(false);
  });
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  // require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  // globalShortcut.register('L', () => {});

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1600,
    height: 900,
    frame: false,
    transparent: true,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  enable(mainWindow.webContents);
  mainWindow.setFullScreenable(true);
  mainWindow.setMaximizable(true);
  mainWindow.setMinimumSize(MIN_WIDTH, MIN_HEIGHT);
  mainWindow.setAspectRatio(16 / 9);

  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(true);
  }

  // mainWindow.setFullScreen(true);
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] },
    (d, c) => {
      if (!d.responseHeaders) {
        return;
      }
      delete d.responseHeaders['X-Frame-Options'];
      delete d.responseHeaders['x-frame-options'];
      delete d.responseHeaders['Content-Security-Policy'];
      delete d.responseHeaders['content-security-policy'];
      c({ cancel: false, responseHeaders: d.responseHeaders });
    }
  );
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
   new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
