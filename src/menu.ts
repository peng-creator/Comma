import {
  app,
  Menu,
  BrowserWindow,
  MenuItemConstructorOptions,
  // app,
  remote,
  // shell,
  // BrowserWindow,
  // MenuItemConstructorOptions,
} from 'electron';
import { importTask } from './compontent/VideoImport/VideoImport';
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

  buildMenu(wordbooks: Wordbook[], selectedWordbook: Wordbook | null): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate(wordbooks, selectedWordbook)
        : this.buildDefaultTemplate(wordbooks, selectedWordbook);

    const menu = remote.Menu.buildFromTemplate(template);
    remote.Menu.setApplicationMenu(menu);

    return menu;
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

    const subMenuVideo: MenuItemConstructorOptions = {
      label: '视频',
      submenu: [
        {
          label: '导入视频',
          click: () => {
            importTask();
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
      subMenuVideo,
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
        label: '&File',
        submenu: [
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
          },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      {
        label: '视频',
        submenu: [
          {
            label: '导入视频',
            click: () => {
              importTask();
            },
          },
        ],
      },
      buildWordbookMenu(wordbooks, selectedWordbook),
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
            ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload();
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen()
                    );
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.webContents.toggleDevTools();
                  },
                },
              ]
            : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen()
                    );
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

    return templateDefault;
  }
}
