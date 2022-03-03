import { RollbackOutlined } from '@ant-design/icons';
import { Row, Col, Button } from 'antd';
import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import wordFrequencyList, { WordFrequency } from '../../resource/words.json';

const TEST_POOL = wordFrequencyList.slice(500, 20000);
const POOL_LENGTH = TEST_POOL.length;
const LEVEL_SIZE = 1000;
const LEVEL_AMOUNT = Math.ceil(POOL_LENGTH / LEVEL_SIZE);

const LEVELS = new Array(LEVEL_AMOUNT).fill([]).map((_, i) => {
  return TEST_POOL.slice(i * LEVEL_SIZE, (i + 1) * LEVEL_SIZE);
});

console.log('LEVELS:', LEVELS);

const pick = (list: WordFrequency[], amount = 10) => {
  const set = new Set<WordFrequency>();
  while (set.size < amount) {
    let index = Math.floor(Math.random() * list.length);
    set.add(list[index]);
  }
  return [...set];
};
const memory: {
  [prop: string]: boolean;
} = {};

type Record = {
  correctTimes: number;
  amount: number;
};

const Component = () => {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [ended, setEnded] = useState(false);
  const [records, setRecords] = useState<Record[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setRecords(LEVELS.map(() => ({ amount: 0, correctTimes: 0 })));
  }, []);

  const pickWord = () => {
    const level = LEVELS[currentLevelIndex];
    const words = pick(level, 5);
    setWords(words.map((f) => f.word));
    setCurrentWordIndex(0);
  };

  useEffect(() => {
    pickWord();
  }, [currentLevelIndex]);

  const currentRecord = records[currentLevelIndex];

  const exam = (pass: boolean) => {
    // 记录测试
    currentRecord.amount += 1;
    memory[words[currentWordIndex]] = pass;
    if (pass) {
      currentRecord.correctTimes += 1;
    }
    // 边界检测
    const nextWordIndex = currentWordIndex + 1;
    if (nextWordIndex <= words.length - 1) {
      console.log('当前Level测试进行中，下一个单词。');
      setCurrentWordIndex(nextWordIndex);
      return;
    }
    console.log('进入层级切换逻辑');
    let nextLevel = 0;
    // 当前Level测试结束，如果当前Level正确率低于60%，则不继续增加Level，否则增加Level
    const { amount, correctTimes } = records[currentLevelIndex];
    const rate = correctTimes / (amount || 1);
    if (rate < 0.6) {
      setEnded(true);
      nextLevel = currentLevelIndex - 1;
      console.log('后退一个层级。');
    } else {
      nextLevel = currentLevelIndex + 1;
      console.log('前进一个层级。');
    }
    if (nextLevel > LEVELS.length - 1) {
      console.log('强者，抵达了最高层级，后退到中间层级继续测试。');
      nextLevel = Math.ceil(LEVELS.length / 2);
    }
    if (nextLevel < 0) {
      console.log('弱者，第0个层级没有通过，保持即可。');
      nextLevel = 0;
    }
    if (nextLevel === currentLevelIndex) {
      console.log('层级没有变动，直接选词。');
      pickWord();
    } else {
      console.log('层级发生变动，进入下个层级:', nextLevel);
      setCurrentLevelIndex(nextLevel);
    }
  };
  console.log('records', JSON.stringify(records, null, 2));
  return (
    <div
      style={{
        marginTop: '22px',
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '40px',
        textAlign: 'center',
        backgroundColor: 'rgb(30, 30, 30)',
        position: 'relative',
      }}
    >
      <Button
        shape="circle"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          fontSize: '30px',
          width: '60px',
          height: '60px',
        }}
        onClick={() => navigate('/')}
      >
        <RollbackOutlined />
      </Button>
      <div>
        <div>
          估计词汇量：
          {records.length > 0 &&
            Math.ceil(
              LEVELS.reduce((size, level, index) => {
                const { amount, correctTimes } = records[index];
                let rate = 0;
                if (amount !== 0) {
                  rate = correctTimes / amount;
                }
                return size + level.length * rate;
              }, 0)
            )}
        </div>
        <div>{words[currentWordIndex] || ''}</div>
        <Row>
          <Col>
            <Button type="primary" onClick={() => exam(true)}>
              认识
            </Button>
          </Col>
          <Col>
            <Button type="danger" onClick={() => exam(false)}>
              不认识
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const VocabularyTest = memo(Component);
