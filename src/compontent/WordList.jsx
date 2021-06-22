import React, { useEffect, useRef, useState } from 'react';
import {
  List,
  Card,
  Col,
  message,
  Row,
  Statistic,
  Input,
  Select,
  Radio,
  Popconfirm,
  Empty,
} from 'antd';
import { DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { AutoSizer } from 'react-virtualized';
import VList from 'react-virtualized/dist/commonjs/List';
import {
  saveStudyRecord,
  saveWordbook,
  delWordbook,
  Wordbook,
} from '../database/wordbook.mjs';
import { myPlayer } from '../player/player';

const { Option } = Select;
const { Search } = Input;

export const WordListComponent = ({
  wordPlaying,
  wordbook,
  wordsToPlay,
  setPlayIndex,
  wordToFileList,
  studyRecord,
  setWordbook,
}) => {
  const [scrollToIndex, setScrollToIndex] = useState(0);
  const [shine, setShine] = useState(false);
  const wordsContainer = useRef(null);
  const [sortBy, setSortBy] = useState(1);
  const [desc, setDesc] = useState(-1);

  const sortedWords = (() => {
    if (wordToFileList === null || wordbook === null) {
      return [];
    }
    let { words } = wordbook;
    return words.sort((a, b) => {
      let compare = 1;
      const { level: levelA, playTimes: playTimesA } = (studyRecord !== null &&
        studyRecord[a]) || {
        playTimes: 0,
        level: 500,
      };
      const { level: levelB, playTimes: playTimesB } = (studyRecord !== null &&
        studyRecord[b]) || {
        playTimes: 0,
        level: 500,
      };
      const countA = (wordToFileList[a] && wordToFileList[a].length) || 0;
      const countB = (wordToFileList[b] && wordToFileList[b].length) || 0;
      switch (sortBy) {
        case 1: // 剪辑数
          compare = countA - countB;
          break;
        case 2: // 生疏度
          compare = levelA - levelB;
          break;
        case 3: // 观看次数
          compare = playTimesA - playTimesB;
          break;
        default:
          break;
      }
      return desc * compare;
    });
  })();

  useEffect(() => {
    const indexOfWordPlaying =
      (wordbook && sortedWords && sortedWords.indexOf(wordPlaying)) || 0;
    setScrollToIndex(indexOfWordPlaying);
  }, [wordPlaying]);

  useEffect(() => {
    setShine(true);
  }, [scrollToIndex]);

  useEffect(() => {
    let timer = null;
    if (shine) {
      timer = setTimeout(() => {
        setShine(false);
      }, 500);
    }
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [shine]);

  if (wordbook === null) {
    return (
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          color: '#000',
        }}
      >
        <Empty description="请创建一个单词本" />
      </div>
    );
  }

  if (sortedWords.length === 0) {
    return (
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          color: '#000',
        }}
      >
        <Empty description="请导入单词" />
      </div>
    );
  }
  const renderItem = ({ index, key, style }) => {
    const word = sortedWords[index];
    const { level, playTimes } = (studyRecord !== null &&
      studyRecord[word]) || {
      playTimes: 0,
      level: 500,
    };
    if (wordToFileList === null) {
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
          className={`word-card ${
            scrollToIndex === index && shine ? 'shine' : ''
          }`}
          extra={
            <Popconfirm
              placement="top"
              title="确认删除当前单词？"
              onConfirm={() => {
                const { words } = wordbook;
                const index = words.indexOf(word);
                if (index === -1) {
                  return;
                }
                console.log('index of word playing:', index);
                const nextWords = [
                  ...words.slice(0, index),
                  ...words.slice(index + 1),
                ];
                console.log('current words of wordbook:', words);
                console.log('next words of wordbook:', nextWords);
                wordbook.words = nextWords;
                const nextWordbook = { ...wordbook, words: nextWords };
                setWordbook(nextWordbook);
                Object.setPrototypeOf(nextWordbook, Wordbook.prototype);
                saveWordbook(wordbook);
                setPlayIndex(-1);
              }}
              okText="确认"
              cancelText="取消"
            >
              <div
                className="del-btn"
                style={{
                  top: '14px',
                  right: '14px',
                }}
              >
                <DeleteOutlined />
              </div>
            </Popconfirm>
          }
        >
          <div className="wordItem">
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
            <div
              className="wordItemPlay"
              onClick={() => {
                const nextWordToPlayIndex = wordsToPlay.indexOf(word);
                if (nextWordToPlayIndex === -1) {
                  message.error('这个词没有视频可以播放！');
                } else {
                  myPlayer.unpause();
                  setPlayIndex(nextWordToPlayIndex);
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
                  value={
                    (wordToFileList[word] && wordToFileList[word].length) || 0
                  }
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
  const onSearch = (searchValue) => {
    if (searchValue.length < 1) {
      return;
    }
    const word = sortedWords.find((word) => word.startsWith(searchValue));
    const searchIndex = sortedWords.indexOf(word);
    if (searchIndex !== -1) {
      setShine(true);
      setScrollToIndex(searchIndex);
    }
  };
  return (
    <div
      style={{
        flexGrow: 1,
        backgroundColor: '#fff',
      }}
    >
      <Search
        placeholder="搜索单词"
        onSearch={onSearch}
        onChange={(e) => {
          const searchValue = e.target.value.trim();
          onSearch(searchValue);
        }}
        enterButton
      />
      <Row
        style={{
          textAlign: 'center',
          backgroundColor: '#fff',
          color: '#000',
          border: '1px solid #d9d9d9',
          borderBottom: '3px solid #d9d9d9',
          height: '40px',
        }}
      >
        <Col
          span={4}
          style={{
            lineHeight: '32px',
          }}
        >
          排序
        </Col>
        <Col span={8}>
          <Select
            style={{ width: '100%', marginTop: '2px' }}
            value={sortBy}
            onChange={(v) => setSortBy(v)}
          >
            <Option value={1}>剪辑数</Option>
            <Option value={2}>生疏度</Option>
            <Option value={3}>观看次数</Option>
          </Select>
        </Col>
        <Col
          span={12}
          style={{
            lineHeight: '32px',
          }}
        >
          <Radio.Group onChange={(e) => setDesc(e.target.value)} value={desc}>
            <Radio value={1}>正序</Radio>
            <Radio value={-1}>逆序</Radio>
          </Radio.Group>
        </Col>
        <Col />
      </Row>
      <div />

      <div style={{ height: 'calc(100% - 32px)' }}>
        <AutoSizer>
          {({ width, height }) => (
            <VList
              ref={wordsContainer}
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
  );
};
