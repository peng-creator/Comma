import { Empty } from 'antd';
import React, { useEffect } from 'react';
import { myPlayer } from '../player/player';

let count = 0;

export const PlayerComponent = ({
  isPlayerMaximum,
  togglePause,
  setIsPlayerMaximum,
  wordsToPlay,
  wordbook,
  onPlayNextFile,
  onPlayPrevFile,
  onPlayNextWord,
  onPlayPrevWord,
  onWordLevelChange,
}) => {
  useEffect(() => {
    if (wordsToPlay && wordsToPlay.length === 0) {
      myPlayer.clear();
    }
  }, [wordsToPlay]);
  let showEmpty = false;
  if (
    wordsToPlay === null ||
    wordsToPlay === undefined ||
    wordsToPlay.length === 0
  ) {
    showEmpty = true;
  }
  if (wordbook === null) {
    showEmpty = true;
  }

  const resizeSubtitle = () =>
    setTimeout(() => {
      console.log('resizeSubtitle...');
      // 设定窗口固定比例会影响这里的效果，加个定时器可以解决。
      myPlayer.resizeSubtitle();
    });

  const exitFullScreen = () => {
    setIsPlayerMaximum(false);
    resizeSubtitle();
  };

  const toggleFullScreen = () => {
    setIsPlayerMaximum(!isPlayerMaximum);
    resizeSubtitle();
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        console.log('e.key:', e.key);
        switch (e.key) {
          case ' ':
            togglePause();
            break;
          case 'l':
          case 'ArrowRight':
            onPlayNextFile();
            break;
          case 'k':
          case 'ArrowUp':
            onPlayPrevWord();
            break;
          case 'j':
          case 'ArrowDown':
            onPlayNextWord();
            break;
          case 'h':
          case 'ArrowLeft':
            onPlayPrevFile();
            break;
          case 'a':
            onWordLevelChange((level) => level - 100);
            break;
          case 'g':
            onWordLevelChange((level) => level + 100);
            break;
          case 'f':
            toggleFullScreen();
            break;
          case 'Escape':
            exitFullScreen();
            break;
          default:
            break;
        }
      }}
      className="video-box-wrapper"
      style={{ position: 'relative' }}
    >
      {showEmpty && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            zIndex: 1,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#fff',
            color: '#000',
          }}
        >
          <Empty description="暂无可播放资源，请导入更多单词或视频" />
        </div>
      )}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        className={`video-box ${isPlayerMaximum ? 'full-screen' : ''}`}
        id="video-box"
        onClick={() => {
          count += 1;
          setTimeout(() => {
            if (count === 1) {
              console.log('single click: ', count);
              togglePause();
            } else if (count === 2) {
              toggleFullScreen();
            }
            count = 0;
          }, 210);
        }}
      />
    </div>
  );
};
