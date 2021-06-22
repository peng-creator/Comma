import { Empty } from 'antd';
import React, { useEffect } from 'react';
import { myPlayer } from '../player/player';

let count = 0;

export const PlayerComponent = ({
  isFullScreen,
  togglePause,
  setIsFullScreen,
  wordsToPlay,
  wordbook,
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
  return (
    <div className="video-box-wrapper" style={{ position: 'relative' }}>
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
      <div
        tabIndex={0}
        className={`video-box ${isFullScreen ? 'full-screen' : ''}`}
        id="video-box"
        onKeyDown={(e) => {
          if (e.key === ' ') {
            togglePause();
          }
        }}
        onClick={(e) => {
          count += 1;
          setTimeout(() => {
            if (count === 1) {
              console.log('single click: ', count);
              togglePause();
            } else if (count === 2) {
              console.log('setTimeout onDoubleClick: ', count);
              setIsFullScreen(!isFullScreen);
              myPlayer.resizeSubtitle();
            }
            count = 0;
          }, 210);
        }}
      />
    </div>
  );
};
