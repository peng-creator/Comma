import React, { useState, useEffect } from 'react';
import './App.global.css';
// import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { Button, message, Steps } from 'antd';
import { promises as fs } from 'fs';
import { SyncOutlined } from '@ant-design/icons';
import { Subscription } from 'rxjs';
import {
  loadWordbooksFromDB,
  Wordbook,
  getStudyRecord,
  saveStudyRecord,
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

export default function App() {
  const [wordbooks, setWordbooks] = useState<Wordbook[] | null>(null);
  const [wordbook, setWordbook] = useState<Wordbook | null>(null);
  const [playIndex, setPlayIndex] = useState(-1);
  const [isFullScreen, setIsFullScreen] = useState(false);
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

  useEffect(() => {
    myPlayer.onSearchWord((w: string) => setSearchWord(w));
  }, []);

  useEffect(() => {
    setSearchWord(wordPlaying);
  }, [wordPlaying]);

  useEffect(() => {
    if (fileIndexToPlay !== -1 && fileIndexToPlay !== filesToPlay.length) {
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
      let wbs: Wordbook[] = wordbooks;
      if (wbs === null) {
        wbs = await loadWordbooksFromDB();
        setWordbooks(wbs);
      }
    })();
  }, []);

  useEffect(() => {
    const wbs: Wordbook[] = wordbooks;
    if (wbs !== null && wbs.length > 0 && wordbook === null) {
      console.log(
        'react===>  单词本列表切换为:',
        wordbooks,
        ' ，选中第一个单词本'
      );
      const wordbook = wbs[0];
      setWordbook(wordbook);
    }
  }, [wordbooks]);

  const selectWordsFromWordbook = async (wordbook: Wordbook) => {
    if (wordbook.words.length > 0) {
      const wordsList: string[] = [];
      const wordToFileList: any = {};
      const wordLoadSemaphore = new Semaphore(10);
      const hide = message.loading('数据加载中', 0);
      for (const w of wordbook.words) {
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
          .catch((err) =>
            console.error('get videos of word ', w, ' error', err)
          );
      }
      await wordLoadSemaphore.acquire(10);
      hide();
      setWordsToPlay(wordsList);
      setWordToFileList(wordToFileList);
      wordLoadSemaphore.release(10);
    }
  };

  useEffect(() => {
    // 从单词本中筛选出有视频剪辑的单词列表
    if (wordbook === null) {
      return;
    }
    console.log('react===>  单词本切换为:', wordbook);
    selectWordsFromWordbook(wordbook);
  }, [wordbook]);

  const playPrevWord = () => {
    if (wordsToPlay === null || wordsToPlay.length === 0) {
      return;
    }
    while (playWordHistoryStackLeft.length > 0) {
      let prevWord = playWordHistoryStackLeft.pop();
      if (prevWord !== null && prevWord !== undefined) {
        const index = wordsToPlay.indexOf(prevWord);
        if (index !== -1) {
          playWordHistoryStackRight.push(prevWord);
          if (index === playIndex) {
            continue;
          }
          setPlayIndex(index);
          return;
        }
      }
    }
    message.warn('没有更多播放历史');
  };

  const computeAndSetPlayIndex = async () => {
    console.log('切换单词计算中。。。');
    if (wordsToPlay === null || wordsToPlay.length === 0) {
      return;
    }
    while (playWordHistoryStackRight.length > 0) {
      let prevWord = playWordHistoryStackRight.pop();
      if (prevWord !== null && prevWord !== undefined) {
        const index = wordsToPlay.indexOf(prevWord);
        if (index !== -1) {
          playWordHistoryStackLeft.push(prevWord);
          if (index === playIndex) {
            continue;
          }
          setPlayIndex(index);
          return;
        }
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
      return weight;
    });
    const picked = pick(weightList);
    console.log(
      '切换单词计算结束，当前正在播放 index:',
      playIndex,
      '，即将播放index:',
      picked,
      ', weight:',
      weightList[picked]
    );
    if (picked === playIndex) {
      // setFileCountToPlayRemain(maxFileCountToPlay);
      if (fileIndexToPlay === 0) {
        myPlayer.player.currentTime(0);
      } else {
        setFileIndexToPlay(0);
      }
      return;
    }
    let pickWord = wordsToPlay[picked];
    playWordHistoryStackLeft.push(pickWord);
    if (playWordHistoryStackLeft.length > 10) {
      playWordHistoryStackLeft.shift();
    }
    setPlayIndex(picked);
  };

  useEffect(() => {
    console.log('react===>  单词播放列表切换为:', wordsToPlay);
    if (wordsToPlay === null || wordsToPlay.length === 0) {
      return;
    }
    setPlayIndex(-1);
  }, [wordsToPlay]);

  useEffect(() => {
    console.log('react===>  自动选择playIndex，当前playIndex:', playIndex);
    if (wordsToPlay === null || wordsToPlay.length === 0) {
      return;
    }
    if (playIndex === -1) {
      computeAndSetPlayIndex();
    }
  }, [wordsToPlay, playIndex]);

  useEffect(() => {
    // 查询该单词的全部视频文件
    if (
      wordsToPlay === null ||
      wordsToPlay.length === 0 ||
      wordbook === null ||
      playIndex === -1
    ) {
      return;
    }
    const wordToPlay = wordsToPlay[playIndex];
    console.log(
      'react===>  切换播放单词至下标:',
      playIndex,
      ', 单词为:',
      wordToPlay
    );
    if (wordToPlay !== undefined) {
      (async () => {
        setWordPlaying(wordToPlay);
        const wordRecord = studyRecord !== null && studyRecord[wordToPlay];
        if (wordRecord !== undefined) {
          setWordPlayingLevel(wordRecord.level);
        } else {
          setWordPlayingLevel(500);
        }
        const files = await getWordVideos(wordToPlay);
        setFileIndexToPlay(-1);
        setFilesToPlay(files);
      })();
    }
  }, [playIndex]);

  useEffect(() => {
    // 重置文件播放下标
    if (filesToPlay.length === 0) {
      return;
    }
    console.log('react===>  文件播放列表变更为:', filesToPlay);
    setFileIndexToPlay(0);
    // setFileCountToPlayRemain(maxFileCountToPlay);
  }, [filesToPlay]);

  useEffect(() => {
    // 播放视频
    if (
      fileIndexToPlay === -1 ||
      wordsToPlay === null ||
      wordsToPlay.length === 0
    ) {
      return;
    }
    console.log(
      'react===> 播放文件切换至 index:',
      fileIndexToPlay,
      '，最大index为：',
      filesToPlay.length - 1
    );
    // console.log('当前单词剩余播放次数:', fileCountToPlayRemain);
    if (wordbook == null || wordsToPlay === null) {
      return;
    }
    const changeToNextFile = () => {
      if (fileIndexToPlay < filesToPlay.length - 1) {
        setFileIndexToPlay(fileIndexToPlay + 1);
      } else {
        setFileIndexToPlay(-1);
        setPlayIndex(-1);
      }
    };
    (async () => {
      const files = filesToPlay;
      const wordToPlay = wordsToPlay[playIndex];
      try {
        const file = files[fileIndexToPlay];
        if (file === undefined) {
          console.log(
            '播放文件 index 溢出，当前单词播放结束，切换到下一单词！'
          );
          computeAndSetPlayIndex();
          return;
        }
        try {
          console.log('try to figure out if file exists: ', file);
          const stat = await fs.stat(file);
          console.log('file does exist:', stat);
        } catch (err) {
          // 文件不存在。
          console.log('fs stat error:', err);
          changeToNextFile();
          return;
        }
        await myPlayer.load(file, wordToPlay);
        await myPlayer.play([s1, s1]);
        await myPlayer.play([
          { ...s1, show: false },
          { ...s1, show: false },
        ]);
        const wordRecord = (studyRecord !== null &&
          studyRecord[wordToPlay]) || {
          playTimes: 0,
          level: 500,
        };
        wordRecord.playTimes += 1;
        studyRecord[wordToPlay] = wordRecord;
        setStudyRecord({ ...studyRecord });
        await saveStudyRecord(studyRecord);
        changeToNextFile();
      } catch (e) {
        console.log(wordToPlay, ' playing error:', e);
      }
    })();
  }, [fileIndexToPlay]);

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
    saveStudyRecord(studyRecord);
  };
  const onPlayNextFile = () => {
    setFileIndexToPlay(fileIndexToPlay + 1);
  };
  const onPlayPrevFile = () => {
    if (fileIndexToPlay - 1 >= 0) {
      setFileIndexToPlay(fileIndexToPlay - 1);
    }
  };
  const cancelVideoImport = () => {
    if (videoImportSubscription === null) {
      return;
    }
    videoImportSubscription.unsubscribe();
    setVideoImportSubscription(null);
  };
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
            <Step title="导入单词" description="选取一个包含单词的TXT文件" />
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
                setWordbook,
              }}
            >
              增加一个单词本
            </AddWordbookComponent>
          )}
          {current === 1 && (
            <WordsImportComponent
              wordbook={wordbook}
              selectWordsFromWordbook={selectWordsFromWordbook}
            />
          )}
          {current === 2 && progress === null && (
            <VideoImportComponent
              {...{
                setProgress,
                selectWordsFromWordbook,
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
                  selectWordsFromWordbook(wordbook);
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
  return (
    <div className="App">
      <div className={['left', (showLeft && 'showLeft') || ''].join(' ')}>
        <WordbookComponent
          setNewWordbookName={setNewWordbookName}
          newWordbookName={newWordbookName}
          wordbook={wordbook}
          wordbooks={wordbooks}
          setWordbook={setWordbook}
          selectWordsFromWordbook={selectWordsFromWordbook}
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
              selectWordsFromWordbook(wordbook);
            }}
            style={{ marginBottom: '5px' }}
            icon={<SyncOutlined />}
          >
            刷新
          </Button>
        )}
        <WordListComponent
          wordPlaying={wordPlaying}
          wordbook={wordbook}
          wordsToPlay={wordsToPlay}
          setPlayIndex={setPlayIndex}
          wordToFileList={wordToFileList}
          studyRecord={studyRecord}
          setWordbook={setWordbook}
        />
      </div>
      <div className="middle">
        <PlayerComponent
          wordbook={wordbook}
          wordsToPlay={wordsToPlay}
          isFullScreen={isFullScreen}
          togglePause={togglePause}
          setIsFullScreen={setIsFullScreen}
          onPlayNextFile={onPlayNextFile}
          onPlayPrevFile={onPlayPrevFile}
          onPlayNextWord={computeAndSetPlayIndex}
          onPlayPrevWord={playPrevWord}
          onWordLevelChange={onWordLevelChange}
        />
        <ControlPanelComponent
          onPlayNextFile={onPlayNextFile}
          onPlayPrevFile={onPlayPrevFile}
          filesToPlay={filesToPlay}
          wordPlaying={wordPlaying}
          studyRecord={studyRecord}
          wordPlayingLevel={wordPlayingLevel}
          setWordPlayingLevel={setWordPlayingLevel}
          setPlaySpeed={setPlaySpeed}
          onPlayPrevWord={playPrevWord}
          computeAndSetPlayIndex={computeAndSetPlayIndex}
          setFileIndexToPlay={setFileIndexToPlay}
          fileIndexToPlay={fileIndexToPlay}
          wordbook={wordbook}
          setWordbook={setWordbook}
          setWordbooks={setWordbooks}
          wordbooks={wordbooks}
          setPlayIndex={setPlayIndex}
          onToggleRight={() => {
            setShowRight(!showRight);
          }}
          onToggleLeft={() => {
            setShowLeft(!showLeft);
          }}
          onWordLevelChange={onWordLevelChange}
        />
      </div>
      <div className={['right', (showRight && 'showRight') || ''].join(' ')}>
        <WordExplainComponent searchWord={searchWord} />
      </div>
    </div>
  );
}
