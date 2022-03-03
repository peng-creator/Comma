import React, { useEffect, useState } from 'react';

import { List, Card, Col, message, Row, Statistic, Input } from 'antd';
import { DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { AutoSizer } from 'react-virtualized';
import VList from 'react-virtualized/dist/commonjs/List';
import { Wordbook } from '../../database/wordbook';
import { myPlayer } from '../../player/player';
import styles from './WordList.css';
import { Desc, SortBy, sortWords } from './sortWords';
import { StudyRecord } from '../../types/StudyRecord';
import { WordClips } from '../../types/WordClips';

const { Search } = Input;

type WordbookListProps = {
  wordbook: Wordbook;
  studyRecord: StudyRecord;
  wordClips: WordClips;
  wordPlaying: string;
  onWordDelete: (word: string) => void;
  wordsToPlay: string[];
  onChangeWordToPlay: (word: string) => void;
};

export const WordListComponent = ({
  wordbook,
  studyRecord,
  wordClips,
  wordPlaying,
  onWordDelete,
  wordsToPlay,
  onChangeWordToPlay,
}: WordbookListProps) => {
  const [scrollToIndex, setScrollToIndex] = useState(0);
  const [shine, setShine] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>(1);
  const [desc, setDesc] = useState<Desc>(-1);

  const { words } = wordbook;
  // console.log('render words of wordbook in WordListComponent:', words);
  const sortedWords = sortWords(words, studyRecord, wordClips, sortBy, desc);
  useEffect(() => {
    const indexOfWordPlaying =
      (wordbook && sortedWords && sortedWords.indexOf(wordPlaying)) || 0;
    setScrollToIndex(indexOfWordPlaying);
  }, [wordPlaying, wordsToPlay]);

  useEffect(() => {
    setShine(true);
  }, [scrollToIndex]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (shine) {
      timer = setTimeout(() => {
        setShine(false);
      }, 500);
    }
    return () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [shine]);
  if (sortedWords.length === 0) {
    return null;
  }
  const renderItem = ({ index, key, style }: any) => {
    const word = sortedWords[index];
    const { level, playTimes } = (studyRecord !== null &&
      studyRecord[word]) || {
      playTimes: 0,
      level: 500,
    };
    if (wordClips === null) {
      return null;
    }
    return (
      <List.Item
        key={key}
        style={{ ...style, padding: 0, borderBottom: '2px solid #c4bfbf' }}
      >
        <Card
          title={
            <span
              style={{
                fontSize: '20px',
                color: word === wordPlaying ? 'rgb(216, 44, 102)' : 'black',
              }}
            >
              {word}
            </span>
          }
          bordered={false}
          className={`${styles.WordCard} ${
            scrollToIndex === index && shine ? styles.Shine : ''
          }`}
          extra={
            <div
              className={styles.DelBtn}
              style={{
                top: '14px',
                right: '14px',
              }}
              onClick={() => onWordDelete(word)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onWordDelete(word);
                }
              }}
            >
              <DeleteOutlined />
            </div>
          }
        >
          <div className={styles.WordItem}>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
            <div
              className={styles.WordItemPlay}
              onClick={() => {
                console.log(
                  'on card click , wordsToPlay:',
                  wordsToPlay,
                  ' word:',
                  word
                );
                const nextWordToPlayIndex = wordsToPlay.indexOf(word);
                if (nextWordToPlayIndex === -1) {
                  message.error('这个词没有视频可以播放！');
                } else {
                  myPlayer.unpause();
                  onChangeWordToPlay(word);
                }
              }}
            >
              <PlayCircleOutlined style={{ fontSize: '60px', color: '#fff' }} />
            </div>
            <Row>
              <Col span={8}>
                <Statistic title="生疏度" value={level} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="剪辑数"
                  value={(wordClips[word] && wordClips[word].length) || 0}
                />
              </Col>
              <Col span={8}>
                <Statistic title="已观看次数" value={playTimes} />
              </Col>
            </Row>
          </div>
        </Card>
      </List.Item>
    );
  };
  const onSearch = (searchValue: string) => {
    if (searchValue.length < 1) {
      return;
    }
    const word = sortedWords.find((word) => word.startsWith(searchValue));
    if (word === undefined) {
      return;
    }
    const searchIndex = sortedWords.indexOf(word);
    if (searchIndex !== -1) {
      setShine(true);
      setScrollToIndex(searchIndex);
    }
  };
  return (
    <div className={styles.WordListWrapper}>
      <div className={styles.WordList}>
        <div className={styles.SearchWrapper}>
          <Search
            placeholder={`在 ${wordbook.name} 中搜索单词`}
            onSearch={onSearch}
            onChange={(e) => {
              const searchValue = e.target.value.trim();
              onSearch(searchValue);
            }}
            onFocus={(e) => {
              e.stopPropagation();
            }}
            onBlur={(e) => {
              e.stopPropagation();
            }}
            enterButton
            style={{ border: 'none' }}
          />
        </div>

        <div className={styles.AutoSizerWrapper}>
          <AutoSizer>
            {({ width, height }) => (
              <VList
                style={{ outline: 'none' }}
                width={width}
                height={height}
                overscanRowCount={10}
                rowCount={sortedWords.length}
                rowHeight={175}
                rowRenderer={renderItem}
                scrollToAlignment="center"
                scrollToIndex={scrollToIndex}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    </div>
  );
};
