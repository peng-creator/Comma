/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/no-nesting */
import {
  CloseOutlined,
  LeftOutlined,
  MoreOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Col, Dropdown, Input, List, Menu, Row, Switch } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoSizer } from 'react-virtualized';
import VList from 'react-virtualized/dist/commonjs/List';
import { fromEvent } from 'rxjs';
import { debounceTime, share } from 'rxjs/operators';
import { promises as fs } from 'fs';
import { ControlPanelComponent } from '../../compontent/ControlPanel/ControlPanel';
import { addSubtitle$ } from '../../compontent/FlashCardMaker/FlashCardMaker';
import { LazyInput } from '../../compontent/LazyInput/LazyInput';
import { VanillaCard } from '../../compontent/VanillaCard/VanillaCard';
import { MyPlayer } from '../../player/player';
import { useBehavior } from '../../state';
import { playSubtitle$ } from '../../state/user_input/playClipAction';
import { playVideo$ } from '../../state/user_input/playVideoAction';
import { Subtitle } from '../../types/Subtitle';
import { Ass } from '../../util/ass.mjs';
import { srtContentToCutProject } from '../../util/srt_util.mjs';
import { millisecondsToTime } from '../../util/index.mjs';
import { tapWord$ } from '../DictAndCardMaker/DictAndCardMaker';

export const VideoPlayer = (
  { onClose }: { onClose: () => void } = { onClose: () => {} }
) => {
  const [videoPath] = useBehavior(playVideo$, '');
  const [subtitles, setSubtitlesState] = useState([] as any[]);
  const navigate = useNavigate();
  const [player, setPlayer] = useState<MyPlayer | null>(null);

  const [adjustPace, setAdjustPace] = useState(100);
  const [scrollToIndex, _setScrollToIndex] = useState(0);
  const vlist = useRef<any>();
  const setScrollToIndex = (nextScrollToIndex: number) => {
    _setScrollToIndex(nextScrollToIndex);
    vlist.current.scrollToRow(nextScrollToIndex);
  };
  const [hideControlPanel, setHideControlPanel] = useState(false);

  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0);

  const [shineTheSubtitle, setShineTheSubtitle] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const [subtitleToPlay, setSubtitleToPlay] = useState<Subtitle | null>(null); // 从外部定位的字幕

  const [controlPanelScale, setControlPanelScale] = useState(1);
  const [controlPanelLeft, setControlPanelLeft] = useState(0);

  const updateSubtitles = (videoPath: string, subtitles: any[]) => {
    if (!videoPath) {
      return;
    }
    if (subtitles.length === 0) {
      return;
    }
    Ass.saveByVideoSrc(videoPath, subtitles);
  };

  const setSubtitles = (subtitles: any[], videoPath: string) => {
    console.log('修改字幕：', subtitles);
    setSubtitlesState(subtitles);
    updateSubtitles(videoPath, subtitles);
    if (player) {
      player.setSubtitle(subtitles);
      console.log('设置片段：', subtitles);
      player.setClips(subtitles);
    }
  };

  const initPlayer = (videoPath: string) => {
    const player = new MyPlayer('video-player');
    player.load(videoPath);
    player.onSearchWord((word: string) => {
      tapWord$.next(word);
    });
    setPlayer(player);
    console.log('initPlayer, loadSrt:');

    fs.readFile(`${videoPath.slice(0, -4)}.json`)
      .then((res) => {
        return JSON.parse(res.toString());
      })
      .catch(() => {
        return Promise.all([
          fs
            .readFile(`${videoPath.slice(0, -4)}.srt`)
            .then((srtBuf) => srtBuf.toString())
            .then((srtContent) => {
              return srtContentToCutProject(srtContent);
            })
            .catch((e) => {
              console.log('srtContentToCutProject(srtContent) error:', e);
              return [];
            }),
          Ass.loadByVideoSrc(videoPath).catch((e) => {
            console.log('Ass.loadByVideoSrc(', videoPath, ') error:', e);
            return [];
          }),
        ]).then(([srtRes, assRes]) => {
          return [...srtRes, ...assRes];
        });
      })
      .then((subtitles) => {
        console.log('load srt or ass to subtitles:', subtitles);
        const validSubtitles = subtitles
          .filter((s: any) => s.subtitles.length > 0)
          .map((sub: any, index: number) => {
            sub.id = index;
            return sub;
          });
        setSubtitles(validSubtitles, videoPath);
        player.setSubtitle(validSubtitles);
        player.setClips(validSubtitles);
        if (validSubtitles.length > 0) {
          player.setCurrentTime(validSubtitles[0].start);
          player.setCurrClipIndex(0);
          player.togglePause();
        }
      });
    return player;
  };

  useEffect(() => {
    if (subtitleToPlay === null) {
      return;
    }
    if (player === null) {
      return;
    }
    if (subtitles === null || subtitles.length === 0) {
      return;
    }
    let playIndex = subtitles.findIndex(({ start, end }) => {
      return start === subtitleToPlay.start && end === subtitleToPlay.end;
    });
    if (playIndex === -1) {
      subtitles.push(subtitleToPlay);
      const nextSubtitles = subtitles.sort((a, b) => a.start - b.start);
      playIndex = nextSubtitles.findIndex(({ start, end }) => {
        return start === subtitleToPlay.start && end === subtitleToPlay.end;
      });
      setSubtitles(nextSubtitles, videoPath);
      console.log('从外部播放字幕, 加入该字幕到字幕列表');
    } else {
      console.log('从外部播放字幕, 字幕已存在列表中');
    }
    const { start } = subtitleToPlay;
    player.setCurrentTime(start);
    player.setCurrClipIndex(playIndex);
    setCurrentSubtitleIndex(playIndex);
    setSubtitleToPlay(null);
  }, [player, subtitleToPlay, subtitles, videoPath]);

  useEffect(() => {
    const sp = playSubtitle$.subscribe({
      next: (subtitle) => {
        if (subtitle === null) {
          return;
        }
        playVideo$.next(subtitle.file);
        setSubtitleToPlay(subtitle);
      },
    });
    return () => {
      sp.unsubscribe();
    };
  }, []);

  const shine = () => {
    setShineTheSubtitle(true);
    setTimeout(() => {
      setShineTheSubtitle(false);
    }, 1000);
  };

  useEffect(() => {
    if (videoContainerRef.current === null) {
      return;
    }
    const mousemove$ = fromEvent(videoContainerRef.current, 'mousemove').pipe(
      share()
    );
    const sp1 = mousemove$.subscribe({
      next: () => {
        setHideControlPanel(false);
      },
    });
    const sp2 = mousemove$.pipe(debounceTime(3000)).subscribe({
      next: () => {
        setHideControlPanel(true);
      },
    });
    return () => {
      sp1.unsubscribe();
      sp2.unsubscribe();
    };
  }, [videoContainerRef]);

  useEffect(() => {
    if (videoPath === '') {
      return;
    }
    const player = initPlayer(videoPath);
    return () => {
      player.clear();
    };
  }, [videoPath]);

  useEffect(() => {
    if (!player || videoContainerRef.current === null) {
      return;
    }
    const interval = setInterval(() => {
      console.log(
        'setCurrentSubtitleIndex player.currClipIndex:',
        player.currClipIndex
      );
      if (player.currClipIndex !== currentSubtitleIndex) {
        setCurrentSubtitleIndex(player.currClipIndex);
        setScrollToIndex(player.currClipIndex);
        shine();
      }
      const video = document.querySelector(
        '#video-player video'
      ) as HTMLDivElement;
      const videoPlayer = document.querySelector(
        '#video-player'
      ) as HTMLDivElement;
      if (videoContainerRef.current !== null) {
        // 设置控制条大小
        let _controlPanelScale = videoContainerRef.current.clientWidth / 850;
        if (_controlPanelScale > 1) {
          _controlPanelScale = 1;
          setControlPanelLeft(0);
        } else {
          setControlPanelLeft(
            -(850 - videoContainerRef.current.clientWidth) / 2
          );
        }
        console.log(
          'setControlPanelScale _controlPanelScale:',
          _controlPanelScale
        );
        setControlPanelScale(_controlPanelScale);
      }
      if (videoContainerRef.current !== null && video !== null) {
        console.log('调整播放器宽高。。');
        const wrapperHeight = videoContainerRef.current.offsetHeight;
        const wrapperWidth = videoContainerRef.current.offsetWidth;
        const videoPlayerHeight = video.clientHeight;
        const videoPlayerWidth = video.clientWidth;
        const ratio = videoPlayerWidth / videoPlayerHeight;
        let newHeight = wrapperWidth / ratio; // 宽度对齐，高度根据视频比例进行缩放。
        let newWidth = wrapperHeight * ratio; // 高度对齐，宽度根据视频比例进行缩放。
        if (newHeight > wrapperHeight + 10) {
          console.log(
            '高度对齐，宽度根据高度调整: newHeight:',
            wrapperHeight,
            ',newWidth:',
            newWidth
          );
          newHeight = wrapperHeight;
        }
        if (newWidth > wrapperWidth + 10) {
          console.log(
            '宽度对齐，高度根据宽度调整: newHeight:',
            wrapperHeight,
            ',newWidth:',
            newWidth
          );
          newWidth = wrapperWidth;
        }
        videoPlayer.style.height = `${newHeight}px`;
        videoPlayer.style.width = `${newWidth}px`;
      }
    }, 16);
    return () => clearInterval(interval);
  }, [player, videoContainerRef, currentSubtitleIndex]);

  const renderItem = ({ index, key, style }: any) => {
    const subtitle = subtitles[index];
    if (!subtitle) {
      return null;
    }
    const { end, start, subtitles: localSubtitles, id } = subtitle;
    const sortAndFoucus = () => {
      const nextSubtitles = subtitles.sort((a, b) => a.start - b.start);
      const nextScrollToIndex = nextSubtitles.findIndex(
        ({ id: _id }) => _id === id
      );
      setSubtitles(nextSubtitles, videoPath);
      setScrollToIndex(nextScrollToIndex);
      shine();
    };
    return (
      <List.Item
        key={key}
        style={{
          ...style,
          padding: '0 14px',
          marginLeft: '6px',
          borderBottom: '2px solid #c4bfbf',
          background:
            shineTheSubtitle && index === scrollToIndex
              ? 'rgba(136, 131, 131, 0.904)'
              : 'none',
          color: '#fff',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            overflowY: 'hidden',
            position: 'relative',
          }}
        >
          <Button
            type="text"
            onClick={() => {
              player?.setCurrentTime(start);
              player?.setCurrClipIndex(index);
            }}
            style={{
              fontSize: '20px',
              color: 'wheat',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2,
            }}
          >
            <PlayCircleOutlined></PlayCircleOutlined>
          </Button>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              height: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div>
                <span>起:</span>
              </div>
              <div>
                <LazyInput
                  modalTitle="修改起始时间（单位: ms）"
                  value={parseInt(start, 10)}
                  displayValueTo={(value) => millisecondsToTime(value)}
                  onChange={(value) => {
                    const changeToValue = parseInt(value, 10) || 0;
                    const nextSubtitles = [
                      ...subtitles.slice(0, index),
                      { ...subtitles[index], start: changeToValue },
                      ...subtitles.slice(index + 1),
                    ].sort((a, b) => a.start - b.start);
                    const nextScrollToIndex = nextSubtitles.findIndex(
                      ({ id: _id }) => _id === id
                    );
                    setSubtitles(nextSubtitles, videoPath);
                    setScrollToIndex(nextScrollToIndex);
                    shine();
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexGrow: 1,
                flexDirection: 'column',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 14px',
              }}
            >
              {localSubtitles.map((s: string, subIndex: number) => {
                return (
                  <Row key={s}>
                    <Col span={24}>
                      <LazyInput
                        value={s}
                        onChange={(value) => {
                          console.log('changed to:', value);
                          const nextSubtitles = [
                            ...subtitles.slice(0, index),
                            {
                              ...subtitles[index],
                              subtitles: [
                                ...localSubtitles.slice(0, subIndex),
                                value,
                                ...localSubtitles.slice(subIndex + 1),
                              ],
                            },
                            ...subtitles.slice(index + 1),
                          ];
                          setSubtitles(nextSubtitles, videoPath);
                        }}
                      ></LazyInput>
                    </Col>
                  </Row>
                );
              })}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Col>止：</Col>
              <Col>
                <LazyInput
                  modalTitle="修改结束时间(单位: ms)"
                  value={parseInt(end, 10)}
                  displayValueTo={(value) => millisecondsToTime(value)}
                  onChange={(value) => {
                    const changeToValue = parseInt(value, 10) || 0;
                    const nextSubtitles = [
                      ...subtitles.slice(0, index),
                      { ...subtitles[index], end: changeToValue },
                      ...subtitles.slice(index + 1),
                    ].sort((a, b) => a.start - b.start);
                    const nextScrollToIndex = nextSubtitles.findIndex(
                      ({ id: _id }) => _id === id
                    );
                    setSubtitles(nextSubtitles, videoPath);
                    setScrollToIndex(nextScrollToIndex);
                    shine();
                  }}
                />
              </Col>
            </div>
          </div>

          <div style={{ position: 'absolute', top: 0, right: 0 }}>
            <Dropdown
              trigger={['click']}
              overlay={
                <Menu>
                  <Menu.Item>
                    <Button
                      type="text"
                      onClick={() => {
                        const subtitle = subtitles[index];
                        addSubtitle$.next({
                          file: videoPath,
                          ...subtitle,
                        });
                      }}
                    >
                      加入卡片
                    </Button>
                  </Menu.Item>
                  <Menu.Item>
                    <Button
                      type="text"
                      onClick={() => {
                        const currentSubtitle = subtitles[index];
                        const nextSubtitle = subtitles[index + 1];
                        let nextPlaySubtitleIndex = currentSubtitleIndex;
                        if (index < nextPlaySubtitleIndex) {
                          nextPlaySubtitleIndex -= 1;
                        }
                        const maxLength = Math.max(
                          currentSubtitle.subtitles.length,
                          nextSubtitle.subtitles.length
                        );
                        const mergeSubtitles = [];
                        for (let i = 0; i < maxLength; i += 1) {
                          const curr = currentSubtitle.subtitles[i] || '';
                          const next = nextSubtitle.subtitles[i] || '';
                          mergeSubtitles.push(`${curr} ${next}`);
                        }
                        const nextSubtitles = [
                          ...subtitles.slice(0, index),
                          {
                            id,
                            start: currentSubtitle.start,
                            end: nextSubtitle.end,
                            subtitles: mergeSubtitles,
                          },
                          ...subtitles.slice(index + 2),
                        ];
                        setSubtitles(nextSubtitles, videoPath);
                        const nextScrollToIndex = nextSubtitles.findIndex(
                          ({ id: _id }) => _id === id
                        );
                        player?.setCurrentTime(
                          subtitles[nextPlaySubtitleIndex].start
                        );
                        player?.setCurrClipIndex(nextPlaySubtitleIndex);
                        setScrollToIndex(nextScrollToIndex);
                        shine();
                      }}
                    >
                      向下合并
                    </Button>
                  </Menu.Item>
                  <Menu.Item>
                    <Button
                      type="link"
                      style={{ color: 'red' }}
                      onClick={() => {
                        const nextSubtitles = [
                          ...subtitles.slice(0, index),
                          ...subtitles.slice(index + 1),
                        ];
                        setSubtitles(nextSubtitles, videoPath);
                      }}
                    >
                      删除
                    </Button>
                  </Menu.Item>
                </Menu>
              }
              placement="bottom"
            >
              <Button type="text" style={{ fontSize: '20px', color: 'wheat' }}>
                <MoreOutlined></MoreOutlined>
              </Button>
            </Dropdown>
          </div>
        </div>
      </List.Item>
    );
  };
  const SubtitleCard = ({ subtitles }: any) => {
    return (
      <VanillaCard style={{ color: 'white' }}>
        <div>{JSON.stringify(subtitles)}</div>
      </VanillaCard>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        padding: '14px',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'relative',
          maxHeight: 'calc(100% - 30%)',
          overflow: 'hidden',
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        ref={videoContainerRef}
      >
        <Button
          type="text"
          style={{
            fontSize: '40px',
            color: 'white',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 2,
          }}
          // shape="circle"
          onClick={() => {
            player?.clear();
            onClose();
          }}
        >
          <CloseOutlined />
        </Button>
        <div
          style={{
            position: 'relative',
          }}
          id="video-player"
          tabIndex={0}
          onKeyDown={() => {}}
          onClick={() => {
            if (player === null) {
              return;
            }
            player.togglePause();
          }}
        ></div>
      </div>
      <div
        style={{
          ...(controlPanelScale === 1
            ? { display: 'flex', justifyContent: 'center' }
            : {}),
        }}
      >
        {player && (
          <ControlPanelComponent
            style={{
              transform: `scale(${controlPanelScale})`,
              position: 'relative',
              left: `${controlPanelLeft}px`,
            }}
            onPlayNextFile={() => {
              const maxIndex = subtitles.length - 1;
              let nextIndex = currentSubtitleIndex + 1;
              if (nextIndex > maxIndex) {
                nextIndex = maxIndex;
              }
              let nextSub = subtitles[nextIndex];
              player?.setCurrentTime(nextSub.start);
              player?.setCurrClipIndex(nextIndex);
              setScrollToIndex(nextIndex);
              shine();
            }}
            onPlayPrevFile={() => {
              const minIndex = 0;
              let nextIndex = currentSubtitleIndex - 1;
              if (nextIndex < minIndex) {
                nextIndex = minIndex;
              }
              let nextSub = subtitles[nextIndex];
              player?.setCurrentTime(nextSub.start);
              player?.setCurrClipIndex(nextIndex);
              setScrollToIndex(nextIndex);
              shine();
            }}
            player={player}
            onSubtitleMoveBack={() => {
              setSubtitles(
                subtitles.map((s) => {
                  return {
                    ...s,
                    start: s.start - 500,
                    end: s.end - 500,
                  };
                }),
                videoPath
              );
            }}
            onSubtitleMoveForward={() => {
              setSubtitles(
                subtitles.map((s) => {
                  return {
                    ...s,
                    start: s.start + 500,
                    end: s.end + 500,
                  };
                }),
                videoPath
              );
            }}
            onLocate={() => {
              setScrollToIndex(currentSubtitleIndex);
              shine();
            }}
          ></ControlPanelComponent>
        )}
      </div>
      <div
        style={{
          minHeight: '30%',
          height: '30%',
          overflow: 'hidden',
          display: 'flex',
          flexGrow: 1,
        }}
      >
        <AutoSizer>
          {({ width, height }) => (
            <VList
              style={{ outline: 'none' }}
              width={width}
              height={height}
              overscanRowCount={10}
              rowCount={subtitles.length}
              rowHeight={100}
              rowRenderer={renderItem}
              scrollToAlignment="start"
              // scrollToIndex={scrollToIndex}
              ref={vlist}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
};
