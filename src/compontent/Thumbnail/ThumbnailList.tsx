import React, { useEffect, useState } from 'react';
import { AutoSizer } from 'react-virtualized';
import VList from 'react-virtualized/dist/commonjs/List';
import { myPlayer } from '../../player/player';
import { Clip } from '../../types/WordClips';
import { Thumbnail } from './Thumbnail';
import styles from './ThumbnailList.css';

type ThumbnailListComponentProps = {
  clipsToPlay: Clip[];
  clipIndexToPlay: number;
  onChangeClipIndexToPlay: (i: number) => void;
};

export const ThumbnailListComponent = ({
  clipsToPlay,
  clipIndexToPlay,
  onChangeClipIndexToPlay,
}: ThumbnailListComponentProps) => {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    let subscription = myPlayer.isPlaying$.subscribe({
      next: (isPlaying) => {
        setAnimated(isPlaying);
      },
    });
    return () => subscription.unsubscribe();
  }, []);
  const renderItem = ({ index, key, style }: any) => {
    const isPlaying = index === clipIndexToPlay;
    return (
      <Thumbnail
        clipIndex={index}
        animated={animated}
        clip={clipsToPlay[index]}
        key={JSON.stringify(clipsToPlay[index])}
        style={style}
        isPlaying={isPlaying}
        onClick={() => {
          if (isPlaying) {
            myPlayer.togglePause();
          } else {
            onChangeClipIndexToPlay(index);
            myPlayer.unpause();
          }
        }}
      />
    );
  };
  return (
    <div className={styles.ThumbnailList}>
      <AutoSizer>
        {({ width, height }) => (
          <VList
            style={{ outline: 'none' }}
            width={width}
            height={height}
            overscanRowCount={10}
            rowCount={clipsToPlay.length}
            rowHeight={200}
            rowRenderer={renderItem}
            scrollToAlignment="auto"
            scrollToIndex={clipIndexToPlay}
          />
        )}
      </AutoSizer>
    </div>
  );
};
