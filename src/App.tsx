import React, { useState, useEffect } from 'react';
import './App.global.css';
import { ipcRenderer } from 'electron';
import { getCurrentWindow } from '@electron/remote';
import TitleBar from 'frameless-titlebar';
import { Menu } from 'electron/main';
import {
  Menu as ContextMenu,
  Item,
  Separator,
  Submenu,
  theme,
} from 'react-contexify';
import styles from './App.css';
import { menu$ } from './state/system/menu';
import { Learning } from './pages/learning/Learning';
import { useBehavior } from './state';
import { contextMenu$ } from './state/system/contextMenu';

const currentWindow = getCurrentWindow();

export default function App() {
  const [isPlayerMaximum, setIsPlayerMaximum] = useState(false);
  const [maximized, setMaximized] = useState(currentWindow.isMaximized());
  const [showTitleBar, setShowTitleBar] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(
    currentWindow.isFullScreen()
  );
  const [menu, setMenu] = useState<Menu | null>(null);

  const [contextMenuList] = useBehavior(contextMenu$, []);

  useEffect(() => {
    setShowTitleBar(!isPlayerMaximum);
    if (!isPlayerMaximum) {
      ipcRenderer.send('showContollButton');
    } else {
      ipcRenderer.send('hideContollButton');
    }
  }, [isPlayerMaximum]);

  // add window listeners for currentWindow
  useEffect(() => {
    const onMaximized = () => {
      console.log('maximized');
      setMaximized(true);
    };
    const onRestore = () => {
      console.log('unmaximize');
      setMaximized(false);
    };
    const onFullScreen = () => {
      const root = document.getElementById('root');
      if (root !== null) {
        root.style.borderRadius = '0';
      }
      setIsFullScreen(true);
    };
    const onLeaveFullScreen = () => {
      const root = document.getElementById('root');
      if (root !== null) {
        root.style.borderRadius = '10px';
      }
      setIsFullScreen(false);
    };
    currentWindow.on('maximize', onMaximized);
    currentWindow.on('unmaximize', onRestore);
    currentWindow.on('enter-full-screen', onFullScreen);
    currentWindow.on('leave-full-screen', onLeaveFullScreen);
    // currentWindow.on('move', onMove);
    return () => {
      currentWindow.removeListener('maximize', onMaximized);
      currentWindow.removeListener('unmaximize', onRestore);
      currentWindow.removeListener('enter-full-screen', onFullScreen);
      currentWindow.removeListener('leave-full-screen', onLeaveFullScreen);
    };
  }, []);

  // used by double click on the titlebar
  // and by the maximize control button
  const handleMaximize = () => {
    if (maximized) {
      console.log('currentWindow.unmaximize()');
      currentWindow.unmaximize();
      setMaximized(false);
      currentWindow.setAspectRatio(16 / 9);
    } else {
      console.log('currentWindow.maximize()');
      currentWindow.setAspectRatio(0);
      currentWindow.maximize();
      setMaximized(true);
    }
  };

  useEffect(() => {
    const subscription = menu$.subscribe({
      next: (menu) => {
        setMenu(menu);
      },
    });
    return () => subscription.unsubscribe();
  }, []);
  return (
    <div className={styles.AppWrapper}>
      <div
        className={[
          'titlebar-wrapper',
          showTitleBar ? 'show' : '',
          isFullScreen ? 'fullscreen' : '',
          isPlayerMaximum ? 'titlebar-player-maximum' : '',
        ].join(' ')}
      >
        <TitleBar
          // iconSrc={icon} // app icon
          currentWindow={currentWindow} // electron window instance
          platform={process.platform} // win32, darwin, linux
          menu={menu}
          theme={
            {
              // any theme overrides specific
              // to your application :)
            }
          }
          title=""
          onClose={() => currentWindow.close()}
          onMinimize={() => currentWindow.minimize()}
          onMaximize={handleMaximize}
          // when the titlebar is double clicked
          onDoubleClick={handleMaximize}
          // hide minimize windows control
          disableMinimize={false}
          // hide maximize windows control
          disableMaximize={false}
          // is the current window maximized?
          maximized={maximized}
        />
      </div>
      <Learning />
      <ContextMenu
        id="MENU_ID"
        animation={false}
        theme={theme.dark}
        style={{ position: 'fixed' }}
      >
        {contextMenuList.map((itemList, index) => {
          return (
            <>
              {itemList.map((item, index) => (
                <Item key={index} onClick={item.onClick}>
                  {item.title}
                </Item>
              ))}
              {index < contextMenuList.length - 1 && <Separator />}
            </>
          );
        })}
      </ContextMenu>
    </div>
  );
}
