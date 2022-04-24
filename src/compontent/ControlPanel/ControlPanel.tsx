import { Button, Col, Input, Modal, Row, Switch, Tooltip } from 'antd';
import React, { CSSProperties, useEffect, useState } from 'react';
import { StepBackwardOutlined, StepForwardOutlined } from '@ant-design/icons';
import { MySlider } from '../MySlider';
import playBtnSrc from '../../../assets/play_btn.svg';
import pauseBtnSrc from '../../../assets/pause_btn.svg';
import locateBtnSrc from '../../../assets/locate.svg';
import styles from './ControlPanel.css';
import { useObservable } from '../../state';
import { ClipSlider } from './ClipSlider';
import { addSubtitleContentAction$ } from '../../state/user_input/addSubtitleContentAction';
import { millisecondsToTime } from '../../util/index.mjs';

export type ControlPanelComponentProps = {
  onPlayNextFile: () => void;
  onPlayPrevFile: () => void;
  onSubtitleMoveBack: () => void;
  onSubtitleMoveForward: () => void;
  onLocate: () => void;
  player: any;
  style?: CSSProperties;
};

export const ControlPanelComponent = ({
  onPlayNextFile,
  onPlayPrevFile,
  onSubtitleMoveBack,
  onSubtitleMoveForward,
  onLocate,
  player,
  style,
}: ControlPanelComponentProps) => {
  const [isPlaying] = useObservable(player.isPlaying$, false);
  const [currentTime] = useObservable(player.currentTime$, 0);
  const [start] = useObservable(player.start$, 0);
  const [end] = useObservable(player.end$, 0);
  const [playByClip, setPlayByClip] = useState(true);
  const [clipLoop, setClipLoop] = useState(true);
  const [addingSubtitle, setAddingSubtitle] = useState(false);
  const [addingSubtitleContent, setAddingSubtitleContent] = useState<
    string | undefined
  >();

  useEffect(() => {
    player?.setPlayByClip(playByClip);
  }, [playByClip, player]);
  useEffect(() => {
    player?.setClipLoop(clipLoop);
  }, [clipLoop, player]);
  // const [duration] = useObservable(
  //   player.duration$.pipe(filter((duration) => !Number.isNaN(duration))),
  //   0
  // );
  // const [clipsToPlay] = useObservable(clipsToPlay$, [] as Clip[]);
  // const [nextClipIndexToPlay] = useObservable(nextClipIndexToPlay$, 0);
  const max = end - start;
  const current = currentTime - start;
  console.log('render progress:', max);
  console.log(
    'render ControlPanelComponent: ',
    'isPlaying:',
    isPlaying,
    ', currentTime:',
    currentTime,
    ', start:',
    start,
    ', end:',
    end
  );
  return (
    <div
      className={styles.PlayBoard}
      style={{ ...style, position: 'relative', zIndex: 1 }}
    >
      <Row>
        <Col span={1}></Col>
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
                  player.setVolume(v);
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
            {/* <FastBackwardOutlined tabIndex={0} onClick={onPlayPrevWord} /> */}
            <StepBackwardOutlined tabIndex={0} onClick={onPlayPrevFile} />
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <img
              tabIndex={0}
              style={{ width: '40px', cursor: 'pointer' }}
              src={isPlaying ? pauseBtnSrc : playBtnSrc}
              alt=""
              onClick={() => player.togglePause()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  player.togglePause();
                }
              }}
            />
            <StepForwardOutlined tabIndex={0} onClick={onPlayNextFile} />
            {/* <FastForwardOutlined tabIndex={0} onClick={onPlayNextWord} /> */}
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
                  player.setPlaySpeed(v);
                }}
                defaultValue={1}
                step={0.05}
              />
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col
          span={3}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {millisecondsToTime(currentTime * 1000)}
        </Col>
        <Col span={18} style={{ display: 'flex', justifyContent: 'center' }}>
          <ClipSlider
            max={max}
            onChange={async (e, v) => {
              const time = (v as number) + start;
              player.player.currentTime(time);
              player.currentTime$.next(time);
            }}
            value={current}
            defaultValue={0}
            step={0.001}
          />
        </Col>
        <Col
          span={3}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {millisecondsToTime(end * 1000)}
        </Col>
      </Row>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        <Row style={{ width: '30%' }}>
          <Col span={8}>逐句切换:</Col>
          <Col span={4}>
            <Switch
              checked={playByClip}
              onChange={(checked) => {
                setPlayByClip(checked);
              }}
            />
          </Col>
          <Col span={8}>单句循环:</Col>
          <Col span={4}>
            <Switch
              // defaultChecked={player?.clipLoop}
              onChange={(checked) => {
                setClipLoop(checked);
              }}
              checked={clipLoop}
            />
          </Col>
        </Row>
        <Col span={6}>
          <Tooltip placement="bottom" title="在字幕列表中显示当前字幕">
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <img
              tabIndex={0}
              onKeyDown={() => {}}
              onClick={() => onLocate()}
              style={{ width: '40px', cursor: 'pointer' }}
              src={locateBtnSrc}
              alt=""
            />
          </Tooltip>
        </Col>
        <Row style={{ width: '30%' }}>
          <Col
            span={6}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div>字幕调节: </div>
          </Col>
          <Col span={6}>
            <Button
              type="text"
              style={{ width: '100%', color: '#fff' }}
              onClick={() => onSubtitleMoveBack()}
            >
              - 0.5s
            </Button>
          </Col>
          <Col span={6}>
            <Button
              type="text"
              style={{ width: '100%', color: '#fff' }}
              onClick={() => onSubtitleMoveForward()}
            >
              + 0.5s
            </Button>
          </Col>
          <Col span={6}>
            <Button
              type="text"
              style={{ color: '#fff' }}
              onClick={() => {
                setAddingSubtitle(true);
              }}
            >
              插入字幕
            </Button>
          </Col>
        </Row>
      </div>
      {addingSubtitle ? (
        <Modal
          title="插入字幕"
          visible={addingSubtitle}
          onOk={() => {
            setAddingSubtitle(false);
            if (addingSubtitleContent) {
              addSubtitleContentAction$.next(addingSubtitleContent);
            }
            setAddingSubtitleContent(undefined);
          }}
          onCancel={() => {
            setAddingSubtitle(false);
            setAddingSubtitleContent(undefined);
          }}
        >
          <div>字幕内容</div>
          <div>
            <Input
              value={addingSubtitleContent}
              onChange={(e) => {
                setAddingSubtitleContent(e.target.value);
              }}
            ></Input>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};
