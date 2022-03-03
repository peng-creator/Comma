import React, { useEffect, useState } from 'react';
import { Button, Empty, message } from 'antd';
import { useNavigate } from 'react-router-dom';

import styles from './Word.css';
import {
  saveStudyRecord,
  saveWordbook,
  Wordbook,
} from '../../database/wordbook';
import { WordListComponent } from '../../compontent/WordList/WordList';
import { useBehavior, useObservable } from '../../state';
import { studyRecord$ } from '../../state/system/studyRecord';
import { partialUpdate } from '../../state/reactive/wordClips';
import { wordToPlay$ } from '../../state/reactive/wordToPlay';
import { PlayerComponent } from '../../compontent/Player/Player';
import '../../side_effect';
import { selectedWordbook$ } from '../../state/user_input/selectedWordbook';
import { nextWordToPlayAction$ } from '../../state/user_input/nextWordToPlayAction';
import { nextClipIndexToPlayAction$ } from '../../state/user_input/nextClipIndexToPlayAction';
import { prevWordToPlayAction$ } from '../../state/user_input/prevWordToPlayAction';
import { prevClipIndexToPlayAction$ } from '../../state/user_input/prevClipIndexToPlayAction';
import { clipsToPlay$ } from '../../state/reactive/clipsToPlay';
import { Clip } from '../../types/WordClips';
import { nextClipIndexToPlay$ } from '../../state/user_input/nextClipIndexToPlay';
import { ControlPanelComponent } from '../../compontent/ControlPanel/ControlPanel';
import { ThumbnailListComponent } from '../../compontent/Thumbnail/ThumbnailList';
import { LeftPanel } from '../../compontent/LeftPanel/LeftPanel';
import { myPlayer } from '../../player/player';
import { deleteWord$ } from '../../state/user_input/deleteWordAction';

type CommaProps = {
  isPlayerMaximum: boolean;
  hideControlPanel: boolean;
  setIsPlayerMaximum: (isPlayerMaximum: boolean) => void;
};

export const Word = ({
  isPlayerMaximum,
  setIsPlayerMaximum,
  hideControlPanel,
}: CommaProps) => {
  // const [wordbooks, setWordbooks] = useBehavior(wordbooks$, [] as Wordbook[]);
  const [wordbook, setWordbook] = useBehavior(
    selectedWordbook$,
    null as Wordbook | null
  );
  const [studyRecord, setStudyRecord] = useBehavior(studyRecord$, {});
  const [wordToPlay, setWordToPlay] = useBehavior(wordToPlay$, '');
  // const [wordClips] = useObservable(wordClips$, {});
  // const [wordsToPlay] = useObservable(wordsToPlay$, [] as string[]);
  const [wordClips] = useState({});
  const wordsToPlay = wordbook?.words || [];
  // const [wordsToPlay] = useState([]);
  const [clipsToPlay] = useObservable(clipsToPlay$, [] as Clip[]);
  const [clipIndexToPlay] = useObservable(nextClipIndexToPlay$, 0);
  const [showThumbnails, setShowThumbnils] = useState(false);
  const [autoShowThumbnails, setAutoShowThumbnils] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [searchWord, setSearchWord] = useState(wordToPlay);
  console.log('render component comma log state ====> start:');
  console.log('studyRecord:', studyRecord);
  console.log('wordToPlay:', wordToPlay);
  // console.log('wordClips:', wordClips);
  console.log('clipsToPlay:', clipsToPlay);
  console.log('clipIndexToPlay:', clipIndexToPlay);
  console.log('showThumbnails:', showThumbnails);
  console.log('autoShowThumbnails:', autoShowThumbnails);
  console.log('showLeftPanel:', showLeftPanel);
  console.log('searchWord:', searchWord);
  console.log('render component comma log state ====> end:');

  const navigate = useNavigate();

  useEffect(() => {
    setSearchWord(wordToPlay);
  }, [wordToPlay]);

  useEffect(() => {
    myPlayer.onSearchWord((word: string) => {
      setSearchWord(word);
    });
  }, []);

  useEffect(() => {
    myPlayer.onAddWordsToWordBook((word: string) => {
      console.log('add word to wordbook:', wordbook);
      if (wordbook === null) {
        return;
      }
      let succeed = wordbook.add(word);
      if (succeed) {
        saveWordbook(wordbook);
        setWordbook(wordbook.copy());
        partialUpdate([word]);
      }
    });
  }, [wordbook]);

  useEffect(() => {
    let closeTimer: NodeJS.Timeout | null = null;
    let timer = setTimeout(() => {
      setAutoShowThumbnils(true);
      if (closeTimer !== null) {
        clearTimeout(closeTimer);
      }
      closeTimer = setTimeout(() => {
        setAutoShowThumbnils(false);
      }, 2500);
    }, 1000);
    return () => {
      clearTimeout(timer);
      if (closeTimer !== null) {
        clearTimeout(closeTimer);
      }
    };
  }, [clipIndexToPlay, wordToPlay]);
  let wordRecord = studyRecord[wordToPlay];
  if (wordRecord === undefined) {
    wordRecord = { level: 500, playTimes: 0 };
  }
  const setWordLevel = (level: number) => {
    if (wordToPlay === undefined) {
      return;
    }
    studyRecord[wordToPlay] = { ...wordRecord, level };
    setStudyRecord({ ...studyRecord });
  };

  return (
    <div className={styles.WordWrapper}>
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: 0,
          width: '100%',
          display: 'flex',
          zIndex: 3,
        }}
      >
        <div>
          <Button shape="circle" onClick={() => navigate('/')}>
            返回
          </Button>
        </div>
        <div className={styles.WordToPlay}>{wordToPlay}</div>
      </div>
      <div>
        {wordbook !== null && (
          <WordListComponent
            wordbook={wordbook}
            studyRecord={studyRecord}
            onChangeWordToPlay={(word) => {
              console.log('play word:', word);
              setWordToPlay(word);
            }}
            onWordDelete={(word) => {
              deleteWord$.next(word);
              console.log('delete word:', word);
              wordbook.words = wordbook.words.filter((w) => w !== word);
              saveWordbook(wordbook);
              setWordbook(wordbook.copy());
            }}
            wordPlaying={wordToPlay}
            wordClips={wordClips}
            wordsToPlay={wordsToPlay}
          />
        )}
      </div>
      {wordbook === null && (
        <Empty
          style={{ color: 'white' }}
          description="您可以从菜单栏中增加单词本"
        />
      )}

      {wordbook !== null && (
        <PlayerComponent
          wordbook={wordbook}
          wordsToPlay={wordsToPlay}
          isPlayerMaximum={isPlayerMaximum}
          setIsPlayerMaximum={setIsPlayerMaximum}
          onPlayNextFile={() => {
            nextClipIndexToPlayAction$.next('');
          }}
          onPlayPrevFile={() => {
            prevClipIndexToPlayAction$.next('');
          }}
          onPlayNextWord={() => {
            nextWordToPlayAction$.next('');
          }}
          onPlayPrevWord={() => {
            prevWordToPlayAction$.next('');
          }}
          onWordLevelChange={(changeLevel: (level: number) => number) => {
            let { level: prevLevel } = wordRecord;
            let nextLevel = changeLevel(prevLevel);
            if (nextLevel < 0) {
              nextLevel = 0;
            }
            if (nextLevel > 1000) {
              nextLevel = 1000;
            }
            message.info(`${wordToPlay} 生疏度: ${nextLevel} `, 0.6);
            setWordLevel(nextLevel);
            wordRecord.level = nextLevel;
            studyRecord[wordToPlay] = wordRecord;
            console.log(
              'studyRecord onWordLevelChange, wordRecord:',
              wordRecord
            );
            saveStudyRecord(studyRecord);
          }}
        />
      )}
      <div
        className={[
          styles.ControlPanelWrapper,
          hideControlPanel && styles.HideControlPanel,
        ].join(' ')}
      >
        {wordsToPlay.length > 0 && (
          <ControlPanelComponent
            onPlayNextFile={() => {
              nextClipIndexToPlayAction$.next('');
            }}
            onPlayPrevFile={() => {
              prevClipIndexToPlayAction$.next('');
            }}
            onPlayNextWord={() => {
              nextWordToPlayAction$.next('');
            }}
            onPlayPrevWord={() => {
              prevWordToPlayAction$.next('');
            }}
            setShowThumbnils={setShowThumbnils}
            showThumbnails={showThumbnails}
            setShowLeftPanel={setShowLeftPanel}
            showLeftPanel={showLeftPanel}
          />
        )}
      </div>

      {wordsToPlay.length > 0 && clipsToPlay.length > 0 && (
        <div
          className={[
            styles.ThumbnailListWrapper,
            (showThumbnails || autoShowThumbnails) && styles.Show,
          ].join(' ')}
        >
          <ThumbnailListComponent
            clipIndexToPlay={clipIndexToPlay}
            clipsToPlay={clipsToPlay}
            onChangeClipIndexToPlay={(i) => nextClipIndexToPlay$.next(i)}
          />
        </div>
      )}
      <div
        className={[styles.LeftPanel, showLeftPanel && styles.Show].join(' ')}
      >
        <LeftPanel
          searchWord={searchWord}
          wordPlaying={wordToPlay}
          wordPlayingLevel={wordRecord?.level || 500}
          setWordPlayingLevel={(level: number) => {
            setWordLevel(level);
            wordRecord.level = level;
            studyRecord[wordToPlay] = wordRecord;
            console.log(
              'studyRecord onWordLevelChange, wordRecord:',
              wordRecord
            );
            saveStudyRecord(studyRecord);
          }}
          setShowLeftPanel={setShowLeftPanel}
          showLeftPanel={showLeftPanel}
        />
      </div>
    </div>
  );
};
