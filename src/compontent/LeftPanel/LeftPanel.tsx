import React from 'react';
import { myPlayer } from '../../player/player';
import { MySlider } from '../MySlider';
import { VideoImportComponent } from '../VideoImport/VideoImport';
import styles from './LeftPanel.css';

type LeftPanelProps = {
  searchWord: string;
  wordPlaying: string;
  wordPlayingLevel: number;
  setWordPlayingLevel: (level: number) => void;
  setShowLeftPanel: (show: boolean) => void;
  showLeftPanel: boolean;
};

export const LeftPanel = ({
  searchWord,
  wordPlaying,
  wordPlayingLevel,
  setWordPlayingLevel,
  setShowLeftPanel,
  showLeftPanel,
}: LeftPanelProps) => {
  // const [paddingTime, setPaddingTime] = useBehavior(paddingTime$, 6000);

  return (
    <div className={styles.LeftPanel}>
      <VideoImportComponent
        setShowLeftPanel={setShowLeftPanel}
        showLeftPanel={showLeftPanel}
      />
      {wordPlaying && (
        <div className={styles.Level}>
          <div>生疏度 - {wordPlaying}</div>
          <MySlider
            value={wordPlayingLevel}
            onChange={(v: number) => {
              setWordPlayingLevel(v);
            }}
            debounce={false}
            max={1000}
          />
        </div>
      )}
      {searchWord && (
        <div className={styles.DictContainer}>
          <iframe
            title="youdao"
            style={{
              width: '100%',
              border: 'none',
              background: '#fff',
              height: '100%',
            }}
            src={`http://mobile.youdao.com/dict?le=eng&q=${searchWord}`}
          />
        </div>
      )}
      {wordPlaying && (
        <div className={styles.Level}>
          <div>剪辑填充</div>
          <MySlider
            defaultValue={6}
            onChange={(v: number) => {
              myPlayer.timePadding = v * 1000;
            }}
            debounce={false}
            max={20}
          />
        </div>
      )}
    </div>
  );
};
