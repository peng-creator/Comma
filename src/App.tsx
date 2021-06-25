import React, { useState, useEffect, useRef } from 'react';
import './App.global.css';
// import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { Button, message, Steps } from 'antd';
import { promises as fs } from 'fs';
import { SyncOutlined } from '@ant-design/icons';
import { BehaviorSubject, from, fromEvent, of, Subscription } from 'rxjs';
import {
  combineLatestWith,
  debounce,
  debounceTime,
  mapTo,
  mergeMap,
  share,
  switchMap,
  tap,
} from 'rxjs/operators';
import { ipcRenderer, remote } from 'electron';
import TitleBar from 'frameless-titlebar';
import {
  loadWordbooksFromDB,
  Wordbook,
  getStudyRecord,
  saveStudyRecord,
  saveWordbook,
} from './database/wordbook.mjs';
import { myPlayer, SubtitleStrategy } from './player/player';
import { pick, Semaphore } from './util/index.mjs';
import { getWordVideos } from './database/db.mjs';
import { AddWordbookComponent } from './compontent/AddWordbook';
import { WordsImportComponent } from './compontent/WordImport';
import { VideoImportComponent } from './compontent/VideoImport';
import { VideoImportProgressComponent } from './compontent/VideoImportProgress';
import { WordbookComponent } from './compontent/Wordbook';
import { WordListComponent } from './compontent/WordList';
import { PlayerComponent } from './compontent/Player';
import { ControlPanelComponent } from './compontent/ControlPanel';
import { WordExplainComponent } from './compontent/WordExplain';

const s1 = new SubtitleStrategy({
  color: 'rgb(243, 235, 165)',
  emphasisColor: 'rgb(128, 31, 115)',
  show: true,
  background: 'rgb(169, 118, 236)',
});

let playWordHistoryStackLeft: string[] = [];
let playWordHistoryStackRight: string[] = [];
const _selectWordsToPlay = async (words: string[]) => {
  if (words.length > 0) {
    const wordsList: string[] = [];
    const wordToFileList: any = {};
    const hide = message.loading('数据加载中', 0);
    const wordLoadSemaphore = new Semaphore(10);
    for (const w of words) {
      await wordLoadSemaphore.acquire();
      getWordVideos(w)
        .then((videos) => {
          if (videos !== null && videos.length > 0) {
            wordsList.push(w);
            wordToFileList[w] = videos;
          }
        })
        .finally(() => {
          wordLoadSemaphore.release();
        })
        .catch((err) => console.error('get videos of word ', w, ' error', err));
    }
    await wordLoadSemaphore.acquire(10);
    hide();
    wordLoadSemaphore.release(10);
    return {
      wordsToPlay: wordsList,
      wordToFileList,
    };
  }
  return {
    wordsToPlay: [],
    wordToFileList: null,
  };
};

const computeWordToPlay = async (
  wordsToPlay: string[],
  wordToFileList: { [prop: string]: string[] },
  studyRecord: { [prop: string]: { playTimes: number; level: number } }
) => {
  console.log('切换单词计算中。。。');
  if (wordsToPlay === null || wordsToPlay.length === 0) {
    console.log('没有可播放单词.');
    return null;
  }
  console.log('words to play:', wordsToPlay);
  console.log('playWordHistoryStackRight:', playWordHistoryStackRight);
  console.log('playWordHistoryStackLeft:', playWordHistoryStackLeft);
  while (playWordHistoryStackRight.length > 0) {
    let prevWord = playWordHistoryStackRight.pop();
    if (prevWord !== null && prevWord !== undefined) {
      console.log('play history prevWord:', prevWord);
      return prevWord;
    }
  }
  const weightList = wordsToPlay.map((word) => {
    const { playTimes, level } = (studyRecord !== null &&
      studyRecord[word]) || {
      playTimes: 0,
      level: 500,
    };
    let wordCount = 0;
    if (wordToFileList !== null && wordToFileList[word] !== undefined) {
      wordCount = wordToFileList[word].length;
      return (
        (Math.log2(wordCount + 1) * (Math.pow(70 / 69, level) + 1)) /
        (playTimes + 1)
      );
    }
    const weight = (Math.pow(70 / 69, level) + 1) / (playTimes + 1);
    if (Number.isNaN(weight)) {
      return 1;
    }
    return weight;
  });
  console.log('weightList:', weightList);
  const picked = pick(weightList);
  console.log('picked index:', picked);
  const wordPicked = wordsToPlay[picked];
  console.log('word picked:', wordPicked);
  return wordPicked;
};

const filesToPlay$ = new BehaviorSubject<string[]>([]);
const fileIndexToPlay$ = new BehaviorSubject<number>(0);
let _wordToPlay = '';
const play$ = filesToPlay$.pipe(
  // filter((files) => files.length > 0),
  switchMap((files) => {
    return fileIndexToPlay$.pipe(
      tap((index) => console.log('tap file index to play:', index)),
      combineLatestWith(of(files))
    );
    // return range(0, files.length).pipe(mapTo(files), zipWith());
  }),
  debounceTime(300),
  switchMap(([index, files]) => {
    console.log('switchMap index:', index);
    console.log('switchMap files:', files);
    const file = files[index];
    return from(
      (async () => {
        try {
          console.log('try to figure out if file exists: ', file);
          const stat = await fs.stat(file);
          console.log('file does exist:', stat);
        } catch (err) {
          // 文件不存在。
          console.log('fs stat error:', err);
          console.log('fileIndexToPlay$.next');
          if (index + 1 < files.length) {
            fileIndexToPlay$.next(index + 1);
          }
          return;
        }
        try {
          await myPlayer.load(file, _wordToPlay);
          await myPlayer.play([s1, s1]);
          await myPlayer.play([
            { ...s1, show: false },
            { ...s1, show: false },
          ]);
          console.log('fileIndexToPlay$.next');
          if (index + 1 < files.length) {
            fileIndexToPlay$.next(index + 1);
          }
        } catch (err) {
          console.log('word', _wordToPlay, ' play error:', err);
        }
      })()
    ).pipe(mapTo(index));
  }),
  share()
);
play$.subscribe();

const wordbookSelect$ = new BehaviorSubject<Wordbook>(null);

function Comma({ isPlayerMaximum, setIsPlayerMaximum }) {
  const [wordbooks, setWordbooks] = useState<Wordbook[] | null>(null);
  const [wordbook, setWordbook] = useState<Wordbook | null>(null);
  const [newWordbookName, setNewWordbookName] = useState('');
  const [wordsToPlay, setWordsToPlay] = useState<string[] | null>(null);
  const [wordPlaying, setWordPlaying] = useState<string | null>(null);
  const [wordPlayingLevel, setWordPlayingLevel] = useState(500);

  const [filesToPlay, setFilesToPlay] = useState<string[]>([]);
  const [fileIndexToPlay, setFileIndexToPlay] = useState(-1);
  const [wordToFileList, setWordToFileList] = useState(null);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [progress, setProgress] = useState(null);
  const [studyRecord, setStudyRecord] = useState<any>({});

  const [showRight, setShowRight] = useState(true);
  const [showLeft, setShowLeft] = useState(true);
  const [videoImportSubscription, setVideoImportSubscription] =
    useState<Subscription | null>(null);
  const [hideGuide, setHideGuide] = useState(
    localStorage.getItem('hideGuide') || false
  );

  const [searchWord, setSearchWord] = useState<string | null>(null);
  const middleRef = useRef(null);

  useEffect(() => {
    setSearchWord(wordPlaying);
  }, [wordPlaying]);

  useEffect(() => {
    if (fileIndexToPlay !== -1 && fileIndexToPlay <= filesToPlay.length - 1) {
      message.info(
        `播放进度：${fileIndexToPlay + 1} / ${filesToPlay.length}`,
        0.5
      );
    }
  }, [fileIndexToPlay, filesToPlay]);

  useEffect(() => {
    getStudyRecord()
      .then((studyRecord) => {
        if (studyRecord !== null) {
          setStudyRecord(studyRecord);
        }
      })
      .catch((error) => console.error('get study record error:', error));
  }, []);

  useEffect(() => {
    if (wordbooks !== null && wordbooks.length === 0) {
      myPlayer.clear();
    }
  }, [wordbooks]);

  useEffect(() => {
    (async () => {
      myPlayer.setPlaySpeed(playSpeed);
    })();
  }, [playSpeed]);

  useEffect(() => {
    console.log('react===> 自动加载单词本列表...');
    (async () => {
      let wbs: Wordbook[] | null = wordbooks;
      if (wbs === null) {
        wbs = await loadWordbooksFromDB();
        setWordbooks(wbs);
      }
    })();
  }, []);

  const changeFileIndexToPlay = (index: number) => {
    setFileIndexToPlay(index);
    fileIndexToPlay$.next(index);
  };

  const changeWordToPlay = async ({ wordToPlay, studyRecord }: any) => {
    if (wordToPlay === null || wordToPlay === undefined) {
      return;
    }
    console.log('react===>  切换播放单词为', wordToPlay);
    const wordRecord = studyRecord !== null && studyRecord[wordToPlay];
    if (wordRecord !== undefined) {
      setWordPlayingLevel(wordRecord.level);
    } else {
      setWordPlayingLevel(500);
    }
    console.log('try to get word videos...');
    const files = await getWordVideos(wordToPlay);
    _wordToPlay = wordToPlay;
    setWordPlaying(wordToPlay);
    console.log('word files:', files);
    setFilesToPlay(files);
    filesToPlay$.next(files);
    changeFileIndexToPlay(0);
  };

  const playNextWord = async ({
    wordsToPlay,
    wordToFileList,
    studyRecord,
  }: any) => {
    const nextWordToPlay = await computeWordToPlay(
      wordsToPlay,
      wordToFileList,
      studyRecord
    );
    if (nextWordToPlay === null || nextWordToPlay === undefined) {
      return;
    }
    if (wordPlaying !== undefined && wordPlaying !== null) {
      playWordHistoryStackLeft.push(wordPlaying);
      if (playWordHistoryStackLeft.length > 10) {
        playWordHistoryStackLeft.shift();
      }
    }
    changeWordToPlay({
      wordToPlay: nextWordToPlay,
      studyRecord,
    });
  };

  useEffect(() => {
    let subscription = play$.subscribe({
      next: (index) => {
        if (index >= filesToPlay.length - 1) {
          console.log('文件播放完毕，play next word');
          playNextWord({
            wordsToPlay,
            wordToFileList,
            studyRecord,
          });
        }
        const wordRecord = studyRecord[_wordToPlay] || {
          playTimes: 0,
          level: 500,
        };
        wordRecord.playTimes += 1;
        studyRecord[_wordToPlay] = wordRecord;
        setStudyRecord({ ...studyRecord });
        saveStudyRecord(studyRecord);
      },
    });
    return () => subscription.unsubscribe();
  }, [filesToPlay, wordsToPlay, wordToFileList, studyRecord]);

  const updateWordsToPlay = async (wb: Wordbook) => {
    if (wb === null) {
      return { wordsToPlay: [], wordToFileList: [] };
    }
    const { wordsToPlay, wordToFileList } = await _selectWordsToPlay(wb.words);
    setWordsToPlay(wordsToPlay);
    setWordToFileList(wordToFileList);
    return { wordsToPlay, wordToFileList };
  };

  const updateWordbook = (wb: Wordbook) => {
    if (wb !== null) {
      wb = wb.copy();
      if (wordbooks !== null && wordbooks.length > 0) {
        const prevWordbook = wordbooks.find(
          (wordbook: Wordbook) => wordbook.name === wb.name
        );
        const prevWordbookIndex = wordbooks.indexOf(prevWordbook);
        setWordbooks([
          ...wordbooks.slice(0, prevWordbookIndex),
          wb,
          ...wordbooks.slice(prevWordbookIndex + 1),
        ]);
      }
    }
    setWordbook(wb);
  };

  const changeWordbook = async (wb: Wordbook) => {
    updateWordbook(wb);
    setWordPlaying(null);
    const { wordsToPlay, wordToFileList } = await updateWordsToPlay(wb);
    playNextWord({
      wordsToPlay,
      wordToFileList,
      studyRecord,
    });
  };

  useEffect(() => {
    let dealing$ = of<any>(1);
    wordbookSelect$
      .pipe(
        debounce(() => {
          return dealing$;
        }),
        mergeMap((wb: Wordbook) => {
          dealing$ = from(
            changeWordbook(wb).catch((e) => {
              console.log('select wordboock update error:', e);
            })
          );
          return dealing$;
        }, 1)
      )
      .subscribe();
  }, []);

  useEffect(() => {
    const wbs: Wordbook[] | null = wordbooks;
    if (wbs !== null && wbs.length > 0 && wordbook === null) {
      const nextWordbook = wbs[0];
      console.log(
        'react===>  单词本列表切换为:',
        wordbooks,
        ' ，选中第一个单词本:',
        nextWordbook
      );
      changeWordbook(nextWordbook);
    }
  }, [wordbooks]);

  const togglePause = async () => {
    myPlayer.togglePause();
  };

  type LevelChanger = (prevLevel: number) => number;

  const onWordLevelChange = (level: number | LevelChanger) => {
    if (wordPlaying === null) {
      return;
    }
    if (typeof level === 'function') {
      level = level(wordPlayingLevel);
    }
    if (level >= 1000) {
      level = 1000;
    }
    if (level <= 0) {
      level = 0;
    }
    setWordPlayingLevel(level);
    message.info(`生疏度： ${level}`, 0.25);
    const wordRecord = studyRecord[wordPlaying] || {
      playTimes: 0,
      level: 500,
    };
    wordRecord.level = level;
    studyRecord[wordPlaying] = wordRecord;
    setStudyRecord({ ...studyRecord });
    saveStudyRecord(studyRecord);
  };

  const onPlayPrevFile = () => {
    const nextFileIndex = fileIndexToPlay - 1;
    if (nextFileIndex >= 0) {
      changeFileIndexToPlay(nextFileIndex);
    } else {
      message.warn('已经是第一个视频了');
    }
  };
  const cancelVideoImport = () => {
    if (videoImportSubscription === null) {
      return;
    }
    videoImportSubscription.unsubscribe();
    setVideoImportSubscription(null);
  };

  const handleNewWordsImportedToWordbook = (
    wb: Wordbook,
    newWords: string[]
  ) => {
    _selectWordsToPlay(newWords)
      .then(
        ({
          wordsToPlay: newWordsToPlay,
          wordToFileList: newWordToFileList,
        }) => {
          const nextWordsToPlay = [
            ...new Set([...(wordsToPlay || []), ...newWordsToPlay]),
          ];
          const nextWordToFileList = {
            ...(wordToFileList || {}),
            ...newWordToFileList,
          };
          setWordsToPlay(nextWordsToPlay);
          setWordToFileList(nextWordToFileList);
          console.log('decide wheather to playNextWord');
          // 如果导入之前没有单词可以播放，且导入后有单词可以播放，则直接计算下一个播放单词，否则不计算
          if (
            (wordsToPlay === null || wordsToPlay.length === 0) &&
            nextWordsToPlay.length > 0
          ) {
            console.log('playNextWord');
            playNextWord({
              wordsToPlay: nextWordsToPlay,
              wordToFileList: nextWordToFileList,
              studyRecord,
            });
          }
        }
      )
      .catch((e) => console.log('handleNewWordsImportedToWordbook error:', e));
    updateWordbook(wb);
  };

  useEffect(() => {
    myPlayer.onSearchWord((w: string) => setSearchWord(w));
    myPlayer.onAddWordsToWordBook((w: string) => {
      if (wordbook === null) {
        return;
      }
      wordbook.add(w);
      saveWordbook(wordbook);
      handleNewWordsImportedToWordbook(wordbook, [w]);
    });
  }, [wordbook, wordsToPlay, wordToFileList]);

  const playPrevWord = (studyRecord: any) => {
    if (playWordHistoryStackLeft.length === 0) {
      message.warn('没有更多播放历史');
      return;
    }
    if (wordPlaying !== undefined && wordPlaying !== null) {
      playWordHistoryStackRight.push(wordPlaying);
    }
    console.log('playWordHistoryStackLeft:', playWordHistoryStackLeft);
    console.log('playWordHistoryStackRight:', playWordHistoryStackRight);
    while (playWordHistoryStackLeft.length > 0) {
      let prevWord = playWordHistoryStackLeft.pop();
      if (prevWord !== null && prevWord !== undefined) {
        changeWordToPlay({
          wordToPlay: prevWord,
          studyRecord,
        });
        return;
      }
    }
  };

  const onPlayPrevWord = () => {
    if (wordsToPlay === null || wordsToPlay.length === 0) {
      return;
    }
    console.log('playPrevWord');
    playPrevWord(studyRecord);
  };

  const onPlayNextWord = () =>
    playNextWord({
      wordsToPlay,
      wordToFileList,
      studyRecord,
    });

  const onPlayNextFile = () => {
    const nextFileIndex = fileIndexToPlay + 1;
    if (nextFileIndex === filesToPlay.length) {
      onPlayNextWord();
      return;
    }
    changeFileIndexToPlay(nextFileIndex);
  };

  const adjustHeight = () => {
    const { current } = middleRef;
    if (current !== null) {
      setTimeout(() => {
        ipcRenderer.send('onAdjustHeight', current.clientHeight);
      }, 260);
    }
  };

  useEffect(() => {
    if (!isPlayerMaximum) {
      adjustHeight();
    }
  }, [isPlayerMaximum]);

  if (wordbooks === null && wordbook === null) {
    return null;
  }
  let current = -1;
  if (wordbooks.length === 0) {
    current = 0;
  } else if (
    wordbook &&
    wordbooks.length === 1 &&
    wordbook.words.length === 0
  ) {
    current = 1;
  } else if (wordsToPlay !== null && wordsToPlay.length === 0) {
    current = 2;
  }
  if (current !== -1 && !hideGuide) {
    const { Step } = Steps;
    return (
      <div className="initApp">
        <div
          style={{
            width: '800px',
            padding: '14px 28px',
            background: '#fff',
            borderRadius: '5px',
          }}
        >
          <Steps current={current} style={{ marginBottom: '10px' }}>
            <Step title="增加一个单词本" />
            <Step title="导入单词" />
            <Step
              title="导入视频"
              description="请将视频文件与同名ASS字幕文件放置在同一目录下，并选取该目录进行导入"
            />
          </Steps>
          {current === 0 && (
            <AddWordbookComponent
              {...{
                wordbooks,
                setNewWordbookName,
                setWordbooks,
                newWordbookName,
                onWordbookChange: changeWordbook,
              }}
            >
              增加一个单词本
            </AddWordbookComponent>
          )}
          {current === 1 && (
            <WordsImportComponent
              wordbook={wordbook}
              onNewWordsImported={handleNewWordsImportedToWordbook}
            />
          )}
          {current === 2 && progress === null && (
            <VideoImportComponent
              {...{
                setProgress,
                onWordbookChange: changeWordbook,
                wordbook,
                progress,
                videoImportSubscription,
                setVideoImportSubscription,
              }}
            />
          )}
          {current === 2 && (
            <div>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'row-reverse',
                }}
              >
                {progress !== null && (
                  <div style={{ width: '400px' }}>
                    <VideoImportProgressComponent
                      style={{ color: '#1f1d1d' }}
                      progress={progress}
                      onCancel={cancelVideoImport}
                    />
                  </div>
                )}
              </div>
              <Button
                style={{ width: '100%', marginTop: '10px' }}
                onClick={() => {
                  setHideGuide(true);
                  changeWordbook(wordbook);
                  localStorage.setItem('hideGuide', 'true');
                }}
              >
                直接进入
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (wordsToPlay === null && wordbooks === null && wordbook === null) {
    return null;
  }
  console.log('app render function , wordbooks:', wordbooks);
  return (
    <div className="App">
      <div className={['left', (showLeft && 'showLeft') || ''].join(' ')}>
        <WordbookComponent
          onWordbookSelected={(wb: Wordbook) => wordbookSelect$.next(wb)}
          onNewWordsImported={handleNewWordsImportedToWordbook}
          setNewWordbookName={setNewWordbookName}
          newWordbookName={newWordbookName}
          wordbook={wordbook}
          wordbooks={wordbooks}
          onWordbookChange={changeWordbook}
          setProgress={setProgress}
          progress={progress}
          setWordbooks={setWordbooks}
          videoImportSubscription={videoImportSubscription}
          setVideoImportSubscription={setVideoImportSubscription}
        />
        <VideoImportProgressComponent
          progress={progress}
          onCancel={cancelVideoImport}
        />

        {progress && progress.percent > 0 && (
          <Button
            onClick={() => {
              changeWordbook(wordbook);
            }}
            style={{ marginBottom: '5px' }}
            icon={<SyncOutlined />}
          >
            刷新
          </Button>
        )}
        <WordListComponent
          onWordDeleted={(word: string, wordbook: Wordbook) => {
            updateWordbook(wordbook);
            if (wordToFileList !== null) {
              delete wordToFileList[word];
              setWordToFileList({ ...wordToFileList });
              const nextWordsToPlay = Object.keys(wordToFileList);
              setWordsToPlay(nextWordsToPlay);
              if (word === wordPlaying) {
                playNextWord({
                  wordsToPlay: nextWordsToPlay,
                  wordToFileList,
                  studyRecord,
                });
              }
            }
          }}
          onChangeWordToPlay={(wordToPlay: string) => {
            if (wordPlaying !== undefined && wordPlaying !== null) {
              playWordHistoryStackLeft.push(wordPlaying);
              if (playWordHistoryStackLeft.length > 10) {
                playWordHistoryStackLeft.shift();
              }
            }
            changeWordToPlay({
              wordToPlay,
              studyRecord,
            });
          }}
          wordPlaying={wordPlaying}
          wordbook={wordbook}
          wordsToPlay={wordsToPlay}
          wordToFileList={wordToFileList}
          studyRecord={studyRecord}
        />
      </div>
      <div className="middle">
        <div className="middle-wrapper" ref={middleRef}>
          <PlayerComponent
            wordbook={wordbook}
            wordsToPlay={wordsToPlay}
            isPlayerMaximum={isPlayerMaximum}
            togglePause={togglePause}
            setIsPlayerMaximum={setIsPlayerMaximum}
            onPlayNextFile={onPlayNextFile}
            onPlayPrevFile={onPlayPrevFile}
            onPlayNextWord={onPlayNextWord}
            onPlayPrevWord={onPlayPrevWord}
            onWordLevelChange={onWordLevelChange}
          />
          <ControlPanelComponent
            onDeleteVideoFile={(file: string) => {
              if (wordToFileList !== null && wordToFileList !== undefined) {
                const nextWordToFileList: any = {};
                Object.keys(wordToFileList).forEach((word: string) => {
                  const videos = wordToFileList[word];
                  const nextVideos = videos.filter((vf: string) => vf !== file);
                  if (nextVideos.length > 0) {
                    nextWordToFileList[word] = nextVideos;
                  }
                });
                setWordToFileList(nextWordToFileList);
                setWordsToPlay(Object.keys(nextWordToFileList));
                if (wordPlaying !== null) {
                  const nextFilesToPlay = nextWordToFileList[wordPlaying];
                  setFilesToPlay(nextFilesToPlay || []);
                  filesToPlay$.next(nextFilesToPlay || []);
                  fileIndexToPlay$.next(fileIndexToPlay);
                }
              }
            }}
            onDeleteWordbook={async (wordbook: Wordbook) => {
              if (wordbooks === null || wordbooks.length === 0) {
                return;
              }
              const _wordbook = wordbooks.find(
                (wb) => wb.name === wordbook.name
              );
              const index = wordbooks.indexOf(_wordbook);
              const nextWordbooks = [
                ...wordbooks.slice(0, index),
                ...wordbooks.slice(index + 1),
              ];
              console.log('nextWordbooks', nextWordbooks);
              setWordbooks(nextWordbooks);
              setWordPlaying(null);
              if (nextWordbooks.length > 0) {
                const nextWordbook = nextWordbooks[0];
                setWordbook(nextWordbook);
                const { wordsToPlay, wordToFileList } = await updateWordsToPlay(
                  nextWordbook
                );
                playNextWord({
                  wordsToPlay,
                  wordToFileList,
                  studyRecord,
                });
              } else {
                setWordbook(null);
                setWordsToPlay(null);
                setWordPlaying(null);
              }
            }}
            onPlayNextFile={onPlayNextFile}
            onPlayPrevFile={onPlayPrevFile}
            filesToPlay={filesToPlay}
            wordPlayingLevel={wordPlayingLevel}
            setPlaySpeed={setPlaySpeed}
            onPlayPrevWord={onPlayPrevWord}
            onPlayNextWord={onPlayNextWord}
            onChangeFileIndexToPlay={changeFileIndexToPlay}
            fileIndexToPlay={fileIndexToPlay}
            wordbook={wordbook}
            onToggleRight={() => {
              setShowRight(!showRight);
              adjustHeight();
            }}
            onToggleLeft={() => {
              setShowLeft(!showLeft);
              adjustHeight();
            }}
            onWordLevelChange={onWordLevelChange}
          />
        </div>
      </div>
      <div className={['right', (showRight && 'showRight') || ''].join(' ')}>
        <WordExplainComponent searchWord={searchWord} />
      </div>
    </div>
  );
}

const currentWindow = remote.getCurrentWindow();
const mousemove$ = fromEvent(document, 'mousemove').pipe(share());

export default function App() {
  const [isPlayerMaximum, setIsPlayerMaximum] = useState(false);
  const [maximized, setMaximized] = useState(currentWindow.isMaximized());
  const [showTitleBar, setShowTitleBar] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(
    currentWindow.isFullScreen()
  );
  useEffect(() => {
    // isPlayerMaximum
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
      setIsFullScreen(true);
    };
    const onLeaveFullScreen = () => {
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
    currentWindow.on('resize', onResize);
    currentWindow.on('maximize', onMaximized);
    currentWindow.on('unmaximize', onRestore);
    currentWindow.on('enter-full-screen', onFullScreen);
    currentWindow.on('leave-full-screen', onLeaveFullScreen);
    currentWindow.on('move', onMove);
    return () => {
      currentWindow.removeListener('maximize', onMaximized);
      currentWindow.removeListener('unmaximize', onRestore);
      currentWindow.removeListener('enter-full-screen', onFullScreen);
      currentWindow.removeListener('leave-full-screen', onLeaveFullScreen);
      currentWindow.removeListener('resize', onResize);
      currentWindow.removeListener('move', onMove);
    };
  }, []);

  // used by double click on the titlebar
  // and by the maximize control button
  const handleMaximize = () => {
    if (maximized) {
      console.log('currentWindow.unmaximize()');
      currentWindow.unmaximize();
    } else {
      console.log('currentWindow.maximize()');
      currentWindow.setAspectRatio(0);
      currentWindow.maximize();
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: showTitleBar ? 'auto' : 'none',
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
          // menu={menu}
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

      <Comma
        isPlayerMaximum={isPlayerMaximum}
        setIsPlayerMaximum={setIsPlayerMaximum}
      />
    </div>
  );
}
