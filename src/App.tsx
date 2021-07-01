import React, { useState, useEffect } from 'react';
import './App.global.css';
import { fromEvent } from 'rxjs';
import { debounceTime, share } from 'rxjs/operators';
import { ipcRenderer, remote } from 'electron';
import TitleBar from 'frameless-titlebar';
import { Menu } from 'electron/main';
import styles from './App.css';
import { myPlayer } from './player/player';
import { menu$ } from './state/system/menu';
import { Comma } from './Comma';

const currentWindow = remote.getCurrentWindow();
const mousemove$ = fromEvent(document, 'mousemove').pipe(share());

export default function App() {
  const [isPlayerMaximum, setIsPlayerMaximum] = useState(false);
  const [maximized, setMaximized] = useState(currentWindow.isMaximized());
  const [showTitleBar, setShowTitleBar] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(
    currentWindow.isFullScreen()
  );
  const [menu, setMenu] = useState<Menu | null>(null);
  const [hideControlPanel, setHideControlPanel] = useState(false);

  useEffect(() => {
    if (maximized) {
      return;
    }
    ipcRenderer.send(
      'onPlayerMaximumChange',
      isPlayerMaximum,
      myPlayer.video?.videoWidth,
      myPlayer.video?.videoHeight
    );
  }, [isPlayerMaximum]);

  useEffect(() => {
    setShowTitleBar(!isPlayerMaximum);
    if (!isPlayerMaximum) {
      ipcRenderer.send('showContollButton');
    } else {
      ipcRenderer.send('hideContollButton');
    }
  }, [isPlayerMaximum]);

  useEffect(() => {
    const subscription = mousemove$.subscribe({
      next: () => {
        ipcRenderer.send('showContollButton');
        setShowTitleBar(true);
        setHideControlPanel(false);
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscription = mousemove$.pipe(debounceTime(3000)).subscribe({
      next: () => {
        if (isPlayerMaximum) {
          ipcRenderer.send('hideContollButton');
          setShowTitleBar(false);
        }
        setHideControlPanel(true);
      },
    });
    return () => {
      subscription.unsubscribe();
    };
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
    const onResize = () => {
      console.log('onResize, set maxmized false');
      setMaximized(false);
    };
    const onMove = () => {
      console.log('onMove, set maxmized false');
      setMaximized(false);
    };
    // currentWindow.on('resize', onResize);
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
      // currentWindow.removeListener('resize', onResize);
      // currentWindow.removeListener('move', onMove);
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
  console.log('menu:', menu);
  return (
    <div
      className={styles.AppWrapper}
      style={{
        cursor: hideControlPanel ? 'none' : 'auto',
      }}
    >
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
      <div className={styles.App}>
        <Comma
          isPlayerMaximum={isPlayerMaximum}
          setIsPlayerMaximum={setIsPlayerMaximum}
          hideControlPanel={hideControlPanel}
        />
      </div>
    </div>
  );
}
