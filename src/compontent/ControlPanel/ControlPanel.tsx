import {
  Button,
  Col,
  Dropdown,
  Input,
  Menu,
  Modal,
  Row,
  Switch,
  Tooltip,
} from 'antd';
import React, { CSSProperties, useEffect, useState } from 'react';
import { StepBackwardOutlined, StepForwardOutlined } from '@ant-design/icons';
import { id } from 'react-horizontal-scrolling-menu/dist/types/constants';
import { MySlider } from '../MySlider';
import playBtnSrc from '../../../assets/play_btn.svg';
import pauseBtnSrc from '../../../assets/pause_btn.svg';
import locateBtnSrc from '../../../assets/locate.svg';
import styles from './ControlPanel.css';
import { useObservable } from '../../state';
import { ClipSlider } from './ClipSlider';
import { addSubtitleContentAction$ } from '../../state/user_input/addSubtitleContentAction';
import { millisecondsToTime } from '../../util/index.mjs';
import { dbRoot } from '../../constant';
import { addSubtitle$ } from '../FlashCardMaker/FlashCardMaker';
import {
  mergeByComma$,
  mergeByChar$,
} from '../../state/user_input/mergeSubtitleAction';

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
              <span>??????</span>
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
              <span>??????</span>
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
              // player.currentTime$.next(time);
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
        <div
          style={{
            width: '30%',
            display: 'flex',
            flexGrow: 1,
            // justifyContent: 'space-around',
          }}
        >
          <div>????????????:</div>
          <div style={{ marginLeft: '15px' }}>
            <Switch
              checked={playByClip}
              onChange={(checked) => {
                setPlayByClip(checked);
              }}
            />
          </div>
          <div style={{ marginLeft: '30px', marginRight: '15px' }}>
            ????????????:
          </div>
          <div>
            <Switch
              // defaultChecked={player?.clipLoop}
              onChange={(checked) => {
                setClipLoop(checked);
              }}
              checked={clipLoop}
            />
          </div>
        </div>
        <div>
          <Tooltip placement="bottom" title="????????????????????????????????????">
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
        </div>
        <div
          style={{
            width: '30%',
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <div style={{ margin: '14px' }}>
            <Dropdown
              trigger={['click']}
              overlay={
                <Menu>
                  <Menu.Item
                    onClick={() => {
                      mergeByComma$.next(1);
                    }}
                  >
                    ?????????????????????
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      mergeByChar$.next(1);
                    }}
                  >
                    ????????????????????????
                  </Menu.Item>
                </Menu>
              }
              placement="bottom"
            >
              <Button type="text" style={{ color: '#fff' }}>
                ????????????
              </Button>
            </Dropdown>
          </div>
          <div style={{ margin: '14px' }}>
            <Button
              type="text"
              style={{ color: '#fff' }}
              onClick={() => {
                setAddingSubtitle(true);
              }}
            >
              ????????????
            </Button>
          </div>
        </div>
      </div>
      {addingSubtitle ? (
        <Modal
          title="????????????"
          visible={addingSubtitle}
          onOk={() => {
            setAddingSubtitle(false);
            if (addingSubtitleContent) {
              addSubtitleContentAction$.next({
                start: currentTime * 1000,
                content: addingSubtitleContent,
              });
            }
            setAddingSubtitleContent(undefined);
          }}
          onCancel={() => {
            setAddingSubtitle(false);
            setAddingSubtitleContent(undefined);
          }}
        >
          <div>????????????</div>
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
