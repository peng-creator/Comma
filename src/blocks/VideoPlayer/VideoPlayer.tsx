/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/no-nesting */
import {
  CloseOutlined,
  DeleteOutlined,
  FileAddOutlined,
  MergeCellsOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  Dropdown,
  Input,
  List,
  Menu,
  Popconfirm,
  Row,
  Switch,
  Tooltip,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { AutoSizer } from 'react-virtualized';
import VList from 'react-virtualized/dist/commonjs/List';
import { promises as fs } from 'fs';
import { ControlPanelComponent } from '../../compontent/ControlPanel/ControlPanel';
import { addSubtitle$ } from '../../compontent/FlashCardMaker/FlashCardMaker';
import { LazyInput } from '../../compontent/LazyInput/LazyInput';
import { MyPlayer } from '../../player/player';
import { playVideo$ } from '../../state/user_input/playVideoAction';
import { Ass } from '../../util/ass.mjs';
import { srtContentToCutProject } from '../../util/srt_util.mjs';
import { millisecondsToTime } from '../../util/index.mjs';
import { playSubtitle$ } from '../../state/user_input/playClipAction';
import { addSubtitleContentAction$ } from '../../state/user_input/addSubtitleContentAction';
import { tapWord$, searchSentence } from '../../state/user_input/tapWordAction';
import { dbRoot, getAbsolutePath } from '../../constant';
import {
  mergeByComma$,
  mergeByChar$,
} from '../../state/user_input/mergeSubtitleAction';
import { Subtitle } from '../../types/Subtitle';

export const VideoPlayer = (
  { onClose }: { onClose: () => void } = { onClose: () => {} }
) => {
  const [videoPath, setVideoPath] = useState('');
  const [subtitles, setSubtitlesState] = useState([] as any[]);
  const [player, setPlayer] = useState<MyPlayer | null>(null);

  const [scrollToIndex, _setScrollToIndex] = useState(0);
  const vlist = useRef<any>();
  const setScrollToIndex = (nextScrollToIndex: number) => {
    _setScrollToIndex(nextScrollToIndex);
    vlist.current.scrollToRow(nextScrollToIndex);
  };

  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0);

  const [shineTheSubtitle, setShineTheSubtitle] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
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
    console.log('???????????????', subtitles);
    setSubtitlesState(subtitles);
    updateSubtitles(videoPath, subtitles);
    if (player) {
      player.setSubtitle(subtitles);
      console.log('???????????????', subtitles);
      player.setClips(subtitles);
    }
  };

  useEffect(() => {
    const sp = addSubtitleContentAction$.subscribe({
      next: (addContent) => {
        if (addContent) {
          setSubtitles(
            [
              {
                start: addContent.start,
                end: addContent.start + 2000,
                subtitles: [addContent.content],
              },
              ...subtitles,
            ],
            videoPath
          );
        }
      },
    });
    return () => sp.unsubscribe();
  }, [videoPath, subtitles]);

  const initPlayer = async (videoPath: string) => {
    const player = new MyPlayer('video-player');
    const loadRet = player.load(videoPath);
    console.log(
      'player.load(videoPath), loadRet:',
      loadRet,
      ', videoPath:',
      videoPath
    );
    player.onSearchWord((word: string) => {
      tapWord$.next(word);
    });
    return fs
      .readFile(`${videoPath.slice(0, -4)}.json`)
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
        player.setSubtitle(validSubtitles);
        player.setClips(validSubtitles);
        return player;
      });
  };

  const shine = () => {
    setShineTheSubtitle(true);
    setTimeout(() => {
      setShineTheSubtitle(false);
    }, 1000);
  };

  const playSubtitle = (subtitles: any, subtitleToPlay: any, player: any) => {
    if (subtitleToPlay === null) {
      console.log('???????????? subtitleToPlay === null');
      return;
    }
    if (player === null) {
      console.log('???????????? player === null');
      return;
    }
    if (subtitles === null || subtitles.length === 0) {
      console.log('???????????? subtitles === null || subtitles.length === 0');
      return;
    }
    let playIndex = subtitles.findIndex(({ start, end }: any) => {
      return start === subtitleToPlay.start && end === subtitleToPlay.end;
    });
    if (playIndex === -1) {
      subtitles.push(subtitleToPlay);
      const nextSubtitles = subtitles.sort(
        (a: any, b: any) => a.start - b.start
      );
      playIndex = nextSubtitles.findIndex(({ start, end }: any) => {
        return start === subtitleToPlay.start && end === subtitleToPlay.end;
      });
      setSubtitles(nextSubtitles, videoPath);
      console.log(
        '???????????? ?????????????????????, ??????????????????????????????:',
        subtitleToPlay
      );
    } else {
      console.log('???????????? ?????????????????????, ????????????????????????:', subtitleToPlay);
    }
    const { start } = subtitleToPlay;
    console.log('???????????? ?????????????????????, setCurrentTime:', start);
    player.setCurrentTime(start);
    console.log('???????????? ?????????????????????, playIndex:', playIndex);
    console.log('player.setCurrClipIndex(playIndex):', playIndex);
    player.setCurrClipIndex(playIndex);
    setCurrentSubtitleIndex(playIndex);
    setTimeout(() => {
      setScrollToIndex(playIndex);
      shine();
    });
  };

  useEffect(() => {
    let videoPath = '';
    let player: any = null;

    const playTheVideoPath = async (videoPath: string) => {
      setPlayer(null);
      setSubtitlesState([]);
      setVideoPath(videoPath);
      console.log('initPlayer(videoPath):', videoPath);
      player?.clear();
      player = await initPlayer(videoPath);
      setPlayer(player);
      console.log('player.togglePause();');
      player.togglePause();
    };

    console.log('playSubtitle$.subscribe');
    const sp1 = playSubtitle$.subscribe({
      next: async (subtitle) => {
        console.log('playSubtitle$.next:', subtitle);
        if (subtitle === null) {
          return;
        }
        console.log('????????????');
        if (videoPath !== subtitle.file) {
          console.log('?????????????????????????????????.');
          videoPath = getAbsolutePath(subtitle.file);
          await playTheVideoPath(videoPath);
        }
        console.log('playSubtitle(player.getSubtitle(), subtitle, player)');
        playSubtitle(player.getSubtitle(), subtitle, player);
        setSubtitles(player.getSubtitle(), videoPath);
        playSubtitle$.next(null);
      },
    });

    const sp2 = playVideo$.subscribe({
      next: async (file) => {
        if (file === '') {
          return;
        }
        console.log('playVideo$:', file);
        if (file !== videoPath) {
          console.log('?????????????????????????????????.');
          videoPath = file;
          await playTheVideoPath(videoPath);
        }
        const subtitles = player.getSubtitle();
        setSubtitles(subtitles, videoPath);
        if (subtitles.length > 0) {
          console.log('??????????????????');
          player.setCurrentTime(subtitles[0].start);
          console.log('player.setCurrClipIndex(0):', 0);
          player.setCurrClipIndex(0);
        } else {
          console.log('??????????????????????????????');
        }
        playVideo$.next('');
      },
    });

    return () => {
      sp1.unsubscribe();
      sp2.unsubscribe();
      player?.clear();
    };
  }, []);

  useEffect(() => {
    if (!player || videoContainerRef.current === null) {
      return;
    }
    const interval = setInterval(() => {
      if (player.currClipIndex !== currentSubtitleIndex) {
        setCurrentSubtitleIndex(player.currClipIndex);
        console.log(
          'setScrollToIndex(player.currClipIndex):',
          player.currClipIndex
        );
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
        // ?????????????????????
        let _controlPanelScale = videoContainerRef.current.clientWidth / 850;
        if (_controlPanelScale > 1) {
          _controlPanelScale = 1;
          setControlPanelLeft(0);
        } else {
          setControlPanelLeft(
            -(850 - videoContainerRef.current.clientWidth) / 2
          );
        }
        // console.log(
        //   'setControlPanelScale _controlPanelScale:',
        //   _controlPanelScale
        // );
        setControlPanelScale(_controlPanelScale);
      }
      const adjustVideoPlayerSize = () => {
        if (videoContainerRef.current !== null && video !== null) {
          // console.log('???????????????????????????');
          const wrapperHeight = videoContainerRef.current.offsetHeight;
          const wrapperWidth = videoContainerRef.current.offsetWidth;
          const videoPlayerHeight = video.clientHeight;
          const videoPlayerWidth = video.clientWidth;
          const notOverflow =
            videoPlayerWidth <= wrapperWidth &&
            videoPlayerHeight <= wrapperHeight;
          videoPlayer.style.height = `${videoPlayerHeight}px`;
          videoPlayer.style.width = `${videoPlayerWidth}px`;
          if (
            notOverflow &&
            !(
              wrapperWidth - videoPlayerWidth > 10 &&
              wrapperHeight - videoPlayerHeight > 10
            )
          ) {
            return;
          }
          const ratio = videoPlayerWidth / videoPlayerHeight;
          let newHeight = wrapperWidth / ratio; // ??????????????????????????????????????????????????????
          let newWidth = wrapperHeight * ratio; // ??????????????????????????????????????????????????????
          if (newHeight > wrapperHeight) {
            // console.log(
            //   '???????????????????????????????????????: newHeight:',
            //   wrapperHeight,
            //   ',newWidth:',
            //   newWidth
            // );
            newHeight = wrapperHeight;
          }
          if (newWidth > wrapperWidth) {
            // console.log(
            //   '???????????????????????????????????????: newHeight:',
            //   wrapperHeight,
            //   ',newWidth:',
            //   newWidth
            // );
            newWidth = wrapperWidth;
          }
          console.log(
            `videoPlayer.style.height = ${newHeight.toFixed(
              0
            )}px;\nvideoPlayer.style.width = ${newWidth.toFixed(0)}px;`
          );
          videoPlayer.style.height = `${newHeight.toFixed(0)}px`;
          videoPlayer.style.width = `${newWidth.toFixed(0)}px`;
        }
      };
      adjustVideoPlayerSize();
    }, 16);
    return () => clearInterval(interval);
  }, [player, videoContainerRef, currentSubtitleIndex]);

  const mergeSubtitles = (subtitleA: Subtitle, subtitleB: Subtitle) => {
    const maxLength = Math.max(
      subtitleA.subtitles.length,
      subtitleB.subtitles.length
    );
    const mergeSubtitles = [];
    for (let i = 0; i < maxLength; i += 1) {
      const a = subtitleA.subtitles[i] || '';
      const b = subtitleB.subtitles[i] || '';
      mergeSubtitles.push(`${a} ${b}`);
    }
    return {
      id: subtitleA.id,
      start: subtitleA.start,
      end: subtitleB.end,
      subtitles: mergeSubtitles,
    };
  };

  useEffect(() => {
    const sp1 = mergeByComma$.subscribe({
      next: () => {
        const nextSubtitles = subtitles.reduce((acc, curr) => {
          let last = acc[acc.length - 1];
          let shouldMerge =
            last &&
            last.subtitles.find((s: string) => s.trim().endsWith(',')) !==
              undefined;
          if (shouldMerge) {
            const merged = mergeSubtitles(last, curr);
            last.end = merged.end;
            last.subtitles = merged.subtitles;
          } else {
            acc.push(curr);
          }
          return acc;
        }, []);
        setSubtitles(nextSubtitles, videoPath);
        const nextScrollToIndex = 0;
        player?.setCurrentTime(nextSubtitles[nextScrollToIndex].start);
        player?.setCurrClipIndex(nextScrollToIndex);
        setScrollToIndex(nextScrollToIndex);
        shine();
      },
    });
    const sp2 = mergeByChar$.subscribe({
      next: () => {
        /**
         *  P??????????????????
            L???????????? 
            M???????????????????????????????????????????????? 
            Z????????????????????????????????????????????? 
            S?????????????????????????????????????????????????????? 
            N????????????????????????????????????????????????????????? 
            C??????????????? 
         */
        const nextSubtitles = subtitles.reduce((acc, curr) => {
          let last = acc[acc.length - 1];
          let shouldMerge =
            last &&
            last.subtitles.find(
              (s: string) => /\p{L}$/u.test(s.trim()) // ????????????
            ) !== undefined;
          if (shouldMerge) {
            const merged = mergeSubtitles(last, curr);
            last.end = merged.end;
            last.subtitles = merged.subtitles;
          } else {
            acc.push(curr);
          }
          return acc;
        }, []);
        setSubtitles(nextSubtitles, videoPath);
        const nextScrollToIndex = 0;
        player?.setCurrentTime(nextSubtitles[nextScrollToIndex].start);
        player?.setCurrClipIndex(nextScrollToIndex);
        setScrollToIndex(nextScrollToIndex);
        shine();
      },
    });
    return () => {
      sp1.unsubscribe();
      sp2.unsubscribe();
    };
  }, [subtitles, videoPath, player]);

  const renderItem = ({ index, key, style }: any) => {
    const subtitle = subtitles[index];
    if (!subtitle) {
      return null;
    }
    const { end, start, subtitles: localSubtitles, id } = subtitle;
    const updateStart = (changeToValue: number) => {
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
      player?.setCurrClipIndex(nextScrollToIndex);
    };
    const updateEnd = (changeToValue: number) => {
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
      player?.setCurrClipIndex(nextScrollToIndex);
    };
    const ajustFrom = (index: number, time: number) => {
      const nextSubtitles = subtitles.map((s: any, i: number) => {
        if (i >= index) {
          return { ...s, start: s.start + time, end: s.end + time };
        }
        return s;
      });
      setSubtitles(nextSubtitles, videoPath);
      shine();
      player?.setCurrClipIndex(scrollToIndex);
    };
    return (
      <List.Item
        key={key}
        style={{
          ...style,
          padding: '14px 14px',
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
                <span>???:</span>
              </div>
              <div>
                <LazyInput
                  menu={[
                    [
                      {
                        onClick: () => {
                          updateStart(start + 1000);
                        },
                        title: '+ 1s',
                      },
                      {
                        onClick: () => {
                          updateStart(start - 1000);
                        },
                        title: '- 1s',
                      },
                    ],
                    [
                      {
                        onClick: () => {
                          updateStart(start + 500);
                        },
                        title: '+ 0.5s',
                      },
                      {
                        onClick: () => {
                          updateStart(start - 500);
                        },
                        title: '- 0.5s',
                      },
                    ],
                    [
                      {
                        onClick: () => {
                          updateStart(start + 250);
                        },
                        title: '+ 0.25s',
                      },
                      {
                        onClick: () => {
                          updateStart(start - 250);
                        },
                        title: '- 0.25s',
                      },
                    ],
                  ]}
                  modalTitle="???????????????????????????: ms???"
                  value={parseInt(start, 10)}
                  displayValueTo={(value) => millisecondsToTime(value)}
                  onChange={(value) => {
                    updateStart(parseInt(value, 10) || 0);
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                overflowY: 'auto',
                fontSize: scrollToIndex === index ? '20px' : '14px',
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  margin: '10px 14px',
                }}
              >
                {localSubtitles.map((s: string, subIndex: number) => {
                  return (
                    <LazyInput
                      key={s + subIndex}
                      menu={[
                        [
                          {
                            title: '??????',
                            onClick: () => {
                              searchSentence(localSubtitles.join(' '));
                            },
                          },
                        ],
                        [
                          {
                            title: '????????????????????? +1s',
                            onClick: () => {
                              ajustFrom(subIndex, 1000);
                            },
                          },
                          {
                            title: '????????????????????? -1s',
                            onClick: () => {
                              ajustFrom(subIndex, -1000);
                            },
                          },
                        ],
                        [
                          {
                            title: '????????????????????? +0.5s',
                            onClick: () => {
                              ajustFrom(subIndex, 500);
                            },
                          },
                          {
                            title: '????????????????????? -0.5s',
                            onClick: () => {
                              ajustFrom(subIndex, -500);
                            },
                          },
                        ],
                        [
                          {
                            title: '????????????????????? +0.25s',
                            onClick: () => {
                              ajustFrom(subIndex, +250);
                            },
                          },
                          {
                            title: '????????????????????? -0.25s',
                            onClick: () => {
                              ajustFrom(subIndex, -250);
                            },
                          },
                        ],
                      ]}
                      onWordClick={(word) => {
                        tapWord$.next(word);
                      }}
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
                  );
                })}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Col>??????</Col>
              <Col>
                <LazyInput
                  modalTitle="??????????????????(??????: ms)"
                  value={parseInt(end, 10)}
                  displayValueTo={(value) => millisecondsToTime(value)}
                  onChange={(value) => {
                    const changeToValue = parseInt(value, 10) || 0;
                    updateEnd(changeToValue);
                  }}
                  menu={[
                    [
                      {
                        onClick: () => {
                          updateEnd(end + 1000);
                        },
                        title: '+ 1s',
                      },
                      {
                        onClick: () => {
                          updateEnd(end - 1000);
                        },
                        title: '- 1s',
                      },
                    ],
                    [
                      {
                        onClick: () => {
                          updateEnd(end + 500);
                        },
                        title: '+ 0.5s',
                      },
                      {
                        onClick: () => {
                          updateEnd(end - 500);
                        },
                        title: '- 0.5s',
                      },
                    ],
                    [
                      {
                        onClick: () => {
                          updateEnd(end + 250);
                        },
                        title: '+ 0.25s',
                      },
                      {
                        onClick: () => {
                          updateEnd(end - 250);
                        },
                        title: '- 0.25s',
                      },
                    ],
                  ]}
                />
              </Col>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0 }}>
            <Tooltip placement="bottom" title="??????????????????">
              <Button
                type="text"
                onClick={() => {
                  player?.setCurrentTime(start);
                  player?.setCurrClipIndex(index);
                }}
                style={{
                  color: 'white',
                }}
              >
                <PlayCircleOutlined></PlayCircleOutlined>
              </Button>
            </Tooltip>
          </div>
          <div style={{ position: 'absolute', top: 0, right: 0 }}>
            <Tooltip placement="bottom" title="??????????????????">
              <Button
                type="text"
                onClick={() => {
                  const subtitle = subtitles[index];
                  addSubtitle$.next({
                    file: videoPath.slice(dbRoot.length),
                    ...subtitle,
                  });
                }}
                style={{
                  color: 'white',
                }}
              >
                <FileAddOutlined />
              </Button>
            </Tooltip>
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
            <Tooltip placement="bottom" title="?????????????????????">
              <Button
                style={{ color: 'white', transform: 'rotate(90deg)' }}
                type="text"
                onClick={() => {
                  const currentSubtitle = subtitles[index];
                  const nextSubtitle = subtitles[index + 1];
                  let nextPlaySubtitleIndex = currentSubtitleIndex;
                  if (index < nextPlaySubtitleIndex) {
                    nextPlaySubtitleIndex -= 1;
                  }
                  const nextSubtitles = [
                    ...subtitles.slice(0, index),
                    mergeSubtitles(currentSubtitle, nextSubtitle),
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
                <MergeCellsOutlined />
              </Button>
            </Tooltip>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0 }}>
            <Popconfirm
              title="??????????????????????????????"
              onConfirm={() => {
                const nextSubtitles = [
                  ...subtitles.slice(0, index),
                  ...subtitles.slice(index + 1),
                ];
                setSubtitles(nextSubtitles, videoPath);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip placement="bottom" title="????????????">
                <Button type="link" style={{ color: 'white' }}>
                  <DeleteOutlined></DeleteOutlined>
                </Button>
              </Tooltip>
            </Popconfirm>
          </div>
        </div>
      </List.Item>
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
              setCurrentSubtitleIndex(nextIndex);
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
              setCurrentSubtitleIndex(nextIndex);
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
              style={{ outline: 'none', overflow: 'hidden auto' }}
              width={width}
              height={height}
              overscanRowCount={10}
              rowCount={subtitles.length}
              rowHeight={130}
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
