import { Button, Col, Popconfirm, Row, Switch } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  FastBackwardOutlined,
  FastForwardOutlined,
  FileSearchOutlined,
  ForwardOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { filter } from 'rxjs/operators';
import { MySlider } from '../MySlider';
import playBtnSrc from '../../../assets/play_btn.svg';
import pauseBtnSrc from '../../../assets/pause_btn.svg';
import { myPlayer } from '../../player/player';
import styles from './ControlPanel.css';
import { PlaySlider } from './PlaySlider';
import { useObservable } from '../../state';
import { clipsToPlay$ } from '../../state/reactive/clipsToPlay';
import { Clip } from '../../types/WordClips';
import { nextClipIndexToPlay$ } from '../../state/user_input/nextClipIndexToPlay';
import { ClipSlider } from './ClipSlider';
import { ThumbnailListOpener } from '../ThumbnailOpener/ThumbnailOpener';

export type ControlPanelComponentProps = {
  onPlayNextFile: () => void;
  onPlayPrevFile: () => void;
  onPlayPrevWord: () => void;
  onPlayNextWord: () => void;
  setShowThumbnils: (showThumbnails: boolean) => void;
  setShowLeftPanel: (showLeftPanel: boolean) => void;
  showThumbnails: boolean;
  showLeftPanel: boolean;
};

export const ControlPanelComponent = ({
  onPlayNextFile,
  onPlayPrevFile,
  onPlayPrevWord,
  onPlayNextWord,
  setShowThumbnils,
  setShowLeftPanel,
  showThumbnails,
  showLeftPanel,
}: ControlPanelComponentProps) => {
  const [isPlaying] = useObservable(myPlayer.isPlaying$, false);
  const [currentTime] = useObservable(myPlayer.currentTime$, 0);
  const [start] = useObservable(myPlayer.start$, 0);
  const [end] = useObservable(myPlayer.end$, 0);
  // const [duration] = useObservable(
  //   myPlayer.duration$.pipe(filter((duration) => !Number.isNaN(duration))),
  //   0
  // );
  // const [clipsToPlay] = useObservable(clipsToPlay$, [] as Clip[]);
  // const [nextClipIndexToPlay] = useObservable(nextClipIndexToPlay$, 0);
  const max = end - start;
  const current = currentTime - start;
  return (
    <div className={styles.PlayBoard}>
      <Row>
        <Col span={1}>
          <div
            className={[
              styles.WordPanel,
              showLeftPanel ? styles.ShowWordPanel : '',
            ].join(' ')}
            onClick={() => {
              setShowLeftPanel(!showLeftPanel);
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setShowLeftPanel(!showLeftPanel);
              }
            }}
          >
            <FileSearchOutlined style={{ fontSize: '25px' }} />
          </div>
        </Col>
        <Col span={6} style={{ padding: '0 12px' }}>
          <Row>
            <Col span={5} style={{ marginTop: '12px' }}>
              <span>音量</span>
            </Col>
            <Col span={18} style={{ marginTop: '6px' }}>
              <MySlider
                // orientation="vertical"
                // marks
                debounce={false}
                // debounceTime={500}
                min={0}
                max={100}
                onChange={async (v) => {
                  myPlayer.setVolume(v);
                }}
                defaultValue={100}
                step={1}
              />
            </Col>
          </Row>
        </Col>
        <Col
          span={10}
          style={{
            fontSize: '40px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '260px',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}
          >
            <FastBackwardOutlined tabIndex={0} onClick={onPlayPrevWord} />
            <StepBackwardOutlined tabIndex={0} onClick={onPlayPrevFile} />
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <img
              tabIndex={0}
              style={{ width: '40px' }}
              src={isPlaying ? pauseBtnSrc : playBtnSrc}
              alt=""
              onClick={() => myPlayer.togglePause()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  myPlayer.togglePause();
                }
              }}
            />
            <StepForwardOutlined tabIndex={0} onClick={onPlayNextFile} />
            <FastForwardOutlined tabIndex={0} onClick={onPlayNextWord} />
          </div>
        </Col>
        <Col span={6} style={{ padding: '0 12px' }}>
          <Row>
            <Col span={5} style={{ marginTop: '12px' }}>
              <span>速度</span>
            </Col>
            <Col span={18} style={{ marginTop: '6px' }}>
              <MySlider
                // orientation="vertical"
                // marks
                debounceTime={500}
                min={0.5}
                max={2}
                onChange={async (v: number) => {
                  // setPlaySpeed(v);
                  myPlayer.setPlaySpeed(v);
                }}
                defaultValue={1}
                step={0.05}
              />
            </Col>
          </Row>
        </Col>
        <Col span={1}>
          <ThumbnailListOpener
            setShowThumbnils={setShowThumbnils}
            showThumbnails={showThumbnails}
          />
        </Col>
      </Row>
      <Row>
        <Col span={24} style={{ display: 'flex', justifyContent: 'center' }}>
          {/* <PlaySlider
            max={max}
            range={[0, max]}
            value={current}
            width={600}
            onRangeChange={(range) => {
              console.log('range:', range);
            }}
          /> */}
          <ClipSlider
            max={max}
            onChange={async (e, v) => {
              myPlayer.player.currentTime((v as number) + start);
            }}
            value={current}
            defaultValue={0}
            step={0.001}
          />
        </Col>
      </Row>
    </div>
  );
};
