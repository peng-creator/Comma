import { Button, Col, Popconfirm, Row, Switch } from 'antd';
import React, { useState } from 'react';
import { promises as fs } from 'fs';
import { DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { removeVideo } from '../database/db.mjs';
import {
  saveStudyRecord,
  saveWordbook,
  delWordbook,
  Wordbook,
} from '../database/wordbook.mjs';
import { MySlider } from './MySlider';

export const ControlPanelComponent = ({
  filesToPlay,
  wordPlaying,
  wordPlayingLevel,
  setWordPlayingLevel,
  setPlaySpeed,
  computeAndSetPlayIndex,
  setFileIndexToPlay,
  fileIndexToPlay,
  studyRecord,
  onToggleRight,
  onToggleLeft,
  wordbook,
  setWordbook,
  setWordbooks,
  wordbooks,
  setPlayIndex,
  onWordLevelChange,
  onPlayNextFile,
  onPlayPrevFile,
}) => {
  const [showMore, setShowMore] = useState(false);
  if (filesToPlay === null) {
    return null;
  }
  return (
    <div className="play-board">
      <Row>
        <Col className="controller-name" span={6}>
          播放进度
        </Col>
        <Col className="controller-widget" span={18}>
          <MySlider
            debounceTime={100}
            min={0}
            max={filesToPlay.length}
            value={fileIndexToPlay}
            onChange={async (v) => {
              setFileIndexToPlay(v);
            }}
            defaultValue={0}
          />
        </Col>
      </Row>
      <Row>
        <Col className="controller-name" span={6}>
          播放速度
        </Col>
        <Col className="controller-widget" span={18}>
          <MySlider
            debounceTime={500}
            min={0.5}
            max={2}
            onChange={async (v) => {
              setPlaySpeed(v);
            }}
            defaultValue={1}
            step={0.05}
          />
        </Col>
      </Row>
      <Row>
        <Col
          className="controller-name"
          style={{ lineHeight: '32px' }}
          span={6}
        >
          生疏程度
        </Col>
        <Col className="controller-widget" span={18}>
          <MySlider
            debounceTime={100}
            max={1000}
            value={wordPlayingLevel}
            onChange={onWordLevelChange}
          />
        </Col>
      </Row>
      <Row>
        <Col className="controller-name" span={20}>
          单词列表
        </Col>
        <Col className="controller-widget" span={4}>
          <Switch
            defaultChecked
            onChange={onToggleLeft}
            checkedChildren="显示"
            unCheckedChildren="隐藏"
          />
        </Col>
      </Row>
      <Row>
        <Col className="controller-name" span={20}>
          单词释义
        </Col>
        <Col className="controller-widget" span={4}>
          <Switch
            defaultChecked
            onChange={onToggleRight}
            checkedChildren="显示"
            unCheckedChildren="隐藏"
          />
        </Col>
      </Row>
      <Row
        style={{ cursor: 'pointer' }}
        onClick={() => {
          setShowMore(!showMore);
        }}
      >
        <Col className="controller-name" span={20}>
          {showMore ? '隐藏' : '显示'}更多
        </Col>
        <Col className="controller-widget showMore-btn" span={4}>
          {showMore ? <UpOutlined /> : <DownOutlined />}
        </Col>
      </Row>
      {showMore && (
        <>
          <Row>
            <Col className="controller-name" span={20} style={{ color: 'red' }}>
              删除剪辑
            </Col>
            <Col className="controller-widget del-btn" span={4}>
              <Popconfirm
                placement="top"
                title="确认删除当前剪辑？"
                onConfirm={() => {
                  console.log('fileIndexToPlay:', fileIndexToPlay);
                  console.log('filesToPlay:', filesToPlay);
                  const currentFile = filesToPlay[fileIndexToPlay];
                  console.log('current file:', currentFile);
                  removeVideo(currentFile);
                  fs.unlink(currentFile);
                  fs.unlink(`${currentFile}.ass`);
                  setFileIndexToPlay(fileIndexToPlay + 1);
                }}
                okText="确认"
                cancelText="取消"
              >
                <div style={{ width: '100%', height: '100%' }}>
                  <DeleteOutlined />
                </div>
              </Popconfirm>
            </Col>
          </Row>
          <Row>
            <Col className="controller-name" span={20} style={{ color: 'red' }}>
              删除单词本
            </Col>
            <Col className="controller-widget del-btn" span={4}>
              <Popconfirm
                placement="top"
                title="确认删除当前单词本？"
                onConfirm={() => {
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
                  if (nextWordbooks.length > 0) {
                    setWordbook(nextWordbooks[0]);
                  } else {
                    setWordbook(null);
                  }
                  delWordbook(wordbook);
                }}
                okText="确认"
                cancelText="取消"
              >
                <div style={{ width: '100%', height: '100%' }}>
                  <DeleteOutlined />
                </div>
              </Popconfirm>
            </Col>
          </Row>
        </>
      )}
      <Row>
        <Col span={8}>
          <Button
            style={{ width: '100%', height: '100%' }}
            onClick={onPlayPrevFile}
          >
            上一视频
          </Button>
        </Col>
        <Col span={8}>
          <Button
            style={{ width: '100%', height: '100%' }}
            onClick={computeAndSetPlayIndex}
          >
            切换单词
          </Button>
        </Col>
        <Col span={8}>
          <Button
            style={{ width: '100%', height: '100%' }}
            onClick={onPlayNextFile}
          >
            下一视频
          </Button>
        </Col>
      </Row>
    </div>
  );
};
