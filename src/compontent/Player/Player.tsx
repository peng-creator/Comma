import { Empty } from 'antd';
import React, { useEffect } from 'react';
import { Wordbook } from '../../database/wordbook';
import { myPlayer } from '../../player/player';
import { useBehavior } from '../../state';
import { clipsLoading$ } from '../../state/system/clipLoading$';
import styles from './Player.css';

let count = 0;

type PlayerComponentProps = {
  isPlayerMaximum: boolean;
  setIsPlayerMaximum: (isPlayerMaximum: boolean) => void;
  wordsToPlay: string[];
  wordbook: Wordbook;
  onPlayNextFile: () => void;
  onPlayPrevFile: () => void;
  onPlayNextWord: () => void;
  onPlayPrevWord: () => void;
  onWordLevelChange: (cb: (level: number) => number) => void;
};

export const PlayerComponent = ({
  isPlayerMaximum,
  wordsToPlay,
  wordbook,
  setIsPlayerMaximum,
  onPlayNextFile,
  onPlayPrevFile,
  onPlayNextWord,
  onPlayPrevWord,
  onWordLevelChange,
}: PlayerComponentProps) => {
  const [clipsLoading, setClipsLoading] = useBehavior(clipsLoading$, false);

  useEffect(() => {
    if (wordsToPlay && wordsToPlay.length === 0) {
      myPlayer.clear();
    }
  }, [wordsToPlay]);
  let showEmpty = false;
  if (
    wordsToPlay === null ||
    wordsToPlay === undefined ||
    wordsToPlay.length === 0 ||
    wordbook === null ||
    wordbook.words.length === null
  ) {
    showEmpty = true;
  }
  let emptyShowReason = '';
  if (wordbook === null) {
    emptyShowReason = '请创建单词本';
  } else if (wordbook.words.length === 0) {
    emptyShowReason = '您可以在菜单栏中导入单词';
  } else if (wordbook.words.length > 100) {
    emptyShowReason = '没有视频可以播放，您可以在菜单栏中导入更多视频';
  } else {
    emptyShowReason =
      '您的单词本中没有剪辑可以播放，请在菜单栏中导入更多单词或视频';
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
            myPlayer.togglePause();
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
      className={styles.VideoBoxWrapper}
      style={{ position: 'relative' }}
    >
      {showEmpty && (
        <div className={styles.EmptyContainer}>
          <Empty description={clipsLoading ? '资源加载中' : emptyShowReason} />
        </div>
      )}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        className={`${styles.VideoBox} ${
          isPlayerMaximum ? styles.FullScreen : ''
        }`}
        id="video-box"
        onClick={() => {
          count += 1;
          setTimeout(() => {
            if (count === 1) {
              console.log('single click: ', count);
              myPlayer.togglePause();
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
