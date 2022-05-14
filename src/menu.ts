import {
  app,
  Menu,
  BrowserWindow,
  MenuItemConstructorOptions,
  shell,
} from 'electron';
import * as remote from '@electron/remote';
import confirm from 'antd/lib/modal/confirm';
import PATH from 'path';
import { showChangeMainDirAction$ } from './state/user_input/showChangeMainDirAction';
import { dbRoot, defaultDbRoot } from './constant';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu() {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }
    if (process.platform === 'darwin') {
      let template = this.buildDarwinTemplate();
      const menu = remote.Menu.buildFromTemplate(template);
      remote.Menu.setApplicationMenu(menu);
      return menu.items;
    }
    return this.buildDefaultTemplate();
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      remote.Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'Comma',
      submenu: [
        {
          label: '关于 Comma',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'Command+Z', selector: 'undo:' },
        { label: '重做', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'Command+X', selector: 'cut:' },
        { label: '复制', accelerator: 'Command+C', selector: 'copy:' },
        { label: '粘贴', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: '全选',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: '视图',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: '全屏切换',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: '开发者工具',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: '视图',
      submenu: [
        {
          label: '全屏切换',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
      ],
    };
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: '窗口',
      submenu: [
        {
          label: '缩小',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: '关闭', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: '全部窗口', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuSettings: DarwinMenuItemConstructorOptions = {
      label: '设置',
      submenu: [
        {
          label: '更换数据目录',
          click() {
            remote.ipcMain.emit('selectMainDir');
            remote.ipcMain.once('onSelectMainDir', (dir) => {
              console.log('remote.ipcMain onSelectMainDir:', dir);
              confirm({
                mask: true,
                title: '确认更换数据目录',
                content: '将为您打开旧数据目录，请您手动迁移数据',
                okText: '确认并重启应用',
                cancelText: '取消更换',
                onOk: () => {
                  shell.showItemInFolder(dbRoot);
                  localStorage.setItem('dbRoot', dir as unknown as string);
                  remote.ipcMain.emit('exitAPP');
                },
                onCancel: () => {},
              });
            });
          },
        },
        {
          label: '切换回默认数据目录',
          click() {
            confirm({
              mask: true,
              title: '确认切换为默认数据目录',
              content: '将为您打开旧数据目录，请您手动迁移数据',
              okText: '确认并重启应用',
              cancelText: '取消切换',
              onOk: () => {
                shell.showItemInFolder(defaultDbRoot);
                localStorage.removeItem('dbRoot');
                remote.ipcMain.emit('exitAPP');
              },
              onCancel: () => {},
            });
          },
        },
      ],
    };
    const subMenuHelp: MenuItemConstructorOptions = {
      label: '帮助',
      submenu: [
        {
          label: 'Comma',
          click() {
            remote.shell.openExternal(
              'https://peng-creator.github.io/comma-web/comma/'
            );
          },
        },
      ],
    };

    const subMenuView =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? subMenuViewDev
        : subMenuViewProd;

    return [
      subMenuAbout,
      subMenuEdit,
      subMenuView,
      subMenuWindow,
      subMenuSettings,
      subMenuHelp,
    ];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: 'Comma',
        submenu: [
          {
            label: '退出',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      {
        label: '设置',
        submenu: [
          {
            label: '更换数据目录',
            click() {
              showChangeMainDirAction$.next(true);
            },
          },
        ],
      },
      {
        label: '帮助',
        submenu: [
          {
            label: 'Comma',
            click() {
              remote.shell.openExternal(
                'https://peng-creator.github.io/comma-web/comma/'
              );
            },
          },
        ],
      },
    ];
    let isDebug =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true';
    const viewSubMenu = {
      label: '视图',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'Ctrl+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: '开发者工具',
          accelerator: 'Alt+Ctrl+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    if (isDebug) {
      templateDefault.push(viewSubMenu);
    }
    return templateDefault;
  }
}
