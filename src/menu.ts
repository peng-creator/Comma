import { app, Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import * as remote from '@electron/remote';
import { Wordbook } from './database/wordbook';
import { newWordbookAction$ } from './state/user_input/newWordbookAction';
import { selectedWordbook$ } from './state/user_input/selectedWordbook';
import { wordImportAction$ } from './state/user_input/wordImportAction';

const buildWordbookMenu = (
  wordbooks: Wordbook[],
  selectedWordbook: Wordbook | null
) => {
  type checkbox = 'checkbox';
  const wordbookSubMenu = wordbooks.map((wb) => {
    return {
      label: wb.name,
      type: 'checkbox' as checkbox,
      checked: wb.name === selectedWordbook?.name,
      click: () => {
        selectedWordbook$.next(wb);
      },
    };
  });
  const subMenuWordbook: MenuItemConstructorOptions = {
    label: '单词本',
    submenu: [
      {
        label: '新增单词本',
        click: () => {
          newWordbookAction$.next('');
        },
      },
      {
        label: selectedWordbook?.name || '请选择单词本',
        submenu: wordbookSubMenu,
      },
      {
        label: '导入单词',
        click: () => {
          wordImportAction$.next('');
        },
      },
    ],
  };
  return subMenuWordbook;
};

// const { Menu } = remote;
interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu(wordbooks: Wordbook[], selectedWordbook: Wordbook | null) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }
    if (process.platform === 'darwin') {
      let template = this.buildDarwinTemplate(wordbooks, selectedWordbook);
      const menu = remote.Menu.buildFromTemplate(template);
      remote.Menu.setApplicationMenu(menu);
      return menu.items;
    }
    return this.buildDefaultTemplate(wordbooks, selectedWordbook);
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

  buildDarwinTemplate(
    wordbooks: Wordbook[],
    selectedWordbook: Wordbook | null
  ): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'Comma',
      submenu: [
        {
          label: '关于 Comma',
          selector: 'orderFrontStandardAboutPanel:',
        },
        // { type: 'separator' },
        // { label: 'Services', submenu: [] },
        // { type: 'separator' },
        // {
        //   label: 'Hide ElectronReact',
        //   accelerator: 'Command+H',
        //   selector: 'hide:',
        // },
        // {
        //   label: 'Hide Others',
        //   accelerator: 'Command+Shift+H',
        //   selector: 'hideOtherApplications:',
        // },
        // { label: 'Show All', selector: 'unhideAllApplications:' },
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
      buildWordbookMenu(wordbooks, selectedWordbook),
      subMenuEdit,
      subMenuView,
      subMenuWindow,
      subMenuHelp,
    ];
  }

  buildDefaultTemplate(
    wordbooks: Wordbook[],
    selectedWordbook: Wordbook | null
  ) {
    const templateDefault = [
      {
        label: 'Comma',
        submenu: [
          // {
          //   label: '&Open',
          //   accelerator: 'Ctrl+O',
          // },
          {
            label: '退出',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      buildWordbookMenu(wordbooks, selectedWordbook),
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
