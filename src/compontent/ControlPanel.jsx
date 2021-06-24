import { Button, Col, Popconfirm, Row, Switch } from 'antd';
import React, { useState } from 'react';
import { promises as fs } from 'fs';
import { DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { removeVideo } from '../database/db.mjs';
import { delWordbook } from '../database/wordbook.mjs';
import { MySlider } from './MySlider';

export const ControlPanelComponent = ({
  filesToPlay,
  wordPlayingLevel,
  setPlaySpeed,
  onChangeFileIndexToPlay,
  fileIndexToPlay,
  onToggleRight,
  onToggleLeft,
  wordbook,
  onWordLevelChange,
  onPlayNextFile,
  onPlayPrevFile,
  onPlayPrevWord,
  onPlayNextWord,
  onDeleteWordbook,
  onDeleteVideoFile,
}) => {
  const [showMore, setShowMore] = useState(false);
  if (filesToPlay === null) {
    return null;
  }
  console.log('render 播放进度, fileIndexToPlay:', fileIndexToPlay);
  return (
    <div className="play-board">
      <Row>
        <Col className="controller-name" span={6}>
          播放进度
        </Col>
        <Col className="controller-widget" span={18}>
          <MySlider
            marks
            debounceTime={100}
            min={0}
            max={filesToPlay.length}
            value={fileIndexToPlay}
            onChange={async (v) => {
              onChangeFileIndexToPlay(v);
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
            marks
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
        <Col className="controller-name" span={6}>
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
                  const currentFile = filesToPlay[fileIndexToPlay];
                  removeVideo(currentFile);
                  fs.unlink(currentFile);
                  fs.unlink(`${currentFile}.ass`);
                  onDeleteVideoFile(currentFile);
                }}
                okText="确认"
                cancelText="取消"
              >
                <DeleteOutlined />
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
                  onDeleteWordbook(wordbook);
                  delWordbook(wordbook);
                }}
                okText="确认"
                cancelText="取消"
              >
                <DeleteOutlined />
              </Popconfirm>
            </Col>
          </Row>
        </>
      )}

      <Row>
        <Col span={12}>
          <Button
            style={{ width: '100%', height: '100%' }}
            onClick={onPlayPrevWord}
          >
            上个单词
          </Button>
        </Col>
        <Col span={12}>
          <Button
            style={{ width: '100%', height: '100%' }}
            onClick={onPlayPrevFile}
          >
            上一视频
          </Button>
        </Col>
      </Row>
      <Row>
        <Col span={12}>
          <Button
            style={{ width: '100%', height: '100%' }}
            onClick={onPlayNextWord}
          >
            下个单词
          </Button>
        </Col>
        <Col span={12}>
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
