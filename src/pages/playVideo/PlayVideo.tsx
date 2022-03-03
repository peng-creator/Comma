import { EditFilled, LeftOutlined } from '@ant-design/icons';
import { Button, Col, Input, List, Row, Switch } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoSizer } from 'react-virtualized';
import VList from 'react-virtualized/dist/commonjs/List';
import { MyPlayer } from '../../player/player';
import { useBehavior } from '../../state';
import { playVideo$ } from '../../state/user_input/playVideoAction';
import { Ass } from '../../util/ass.mjs';

export const PlayVideo = () => {
  const [videoPath, setVideoPath] = useBehavior(playVideo$, '');
  const navigate = useNavigate();
  const [subtitles, setSubtitlesState] = useState([] as any[]);
  const [player, setPlayer] = useState<MyPlayer | null>(null);

  const [adjustPace, setAdjustPace] = useState(100);
  const [scrollToIndex, setScrollToIndex] = useState(0);

  const [bySentence, setBySentence] = useState(true);
  const [sentenceLoop, setSentenceLoop] = useState(true);

  const [currentSubtitle, setCurrentSubtitle] = useState<any>(null);

  const setSubtitles = (subtitles: any[]) => {
    console.log('修改字幕：', subtitles);
    setSubtitlesState(subtitles);
    if (player) {
      player.setSubtitle(subtitles);
      console.log('设置片段：', subtitles);
      player.setClips(subtitles);
    }
  };

  // useEffect(() => {
  //   if (!player || !bySentence || !subtitles) {
  //     return;
  //   }
  //   let currentSubtitle: any;
  //   let currentIndex = 0;
  //   let sp = player.currentTime$.subscribe({
  //     next: (currentTime: number) => {
  //       currentTime *= 1000;
  //       if (
  //         currentSubtitle &&
  //         currentSubtitle.start <= currentTime &&
  //         currentSubtitle.end >= currentTime
  //       ) {
  //         return;
  //       }
  //       // 前片段播放完毕。
  //       let prevSubtitle = currentSubtitle;
  //       currentSubtitle = subtitles.find(({ start, end }) => {
  //         return start <= currentTime && end >= currentTime;
  //       });
  //       if (currentSubtitle !== undefined) {
  //         currentIndex = subtitles.indexOf(currentSubtitle);
  //       }
  //       if (currentSubtitle === undefined) {
  //         if (prevSubtitle === undefined) {
  //           // 默认情况，选中第一个片段
  //           [currentSubtitle] = subtitles;
  //         } else {
  //           // 说明当前片段结束，但影片播放到两个片段之间。
  //           let prevIndex = subtitles.indexOf(prevSubtitle); // 查找 prevIndex，找不到则说明被删除了。
  //           console.log(
  //             '片段切换：prevIndex:',
  //             prevIndex,
  //             ' currentIndex:',
  //             currentIndex
  //           );
  //           if (!prevIndex) {
  //             currentSubtitle = subtitles[currentIndex];
  //           } else {
  //             currentIndex += 1;
  //             currentSubtitle = subtitles[currentIndex];
  //           }
  //         }
  //       }
  //       setCurrentSubtitle(currentSubtitle);
  //       if (prevSubtitle !== currentSubtitle && currentSubtitle !== undefined) {
  //         // 片段切换
  //         console.log('片段切换：', currentSubtitle);
  //         player.setCurrentTime(currentSubtitle.start);
  //       }
  //     },
  //   });
  //   return () => sp.unsubscribe();
  //   // player.duration$.subscribe();
  // }, [player, bySentence, subtitles]);

  useEffect(() => {
    if (videoPath === '') {
      return;
    }
    const player = new MyPlayer('video-player');
    player.load(videoPath);
    setPlayer(player);
    Ass.loadByVideoSrc(videoPath)
      .then((subtitles) => {
        const validSubtitles = subtitles.filter((s) => s.subtitles.length > 0);
        setSubtitles(validSubtitles);
        player.setClips(validSubtitles);
      })
      .catch((e) => {
        console.log('Ass.loadByVideoSrc(', videoPath, ') error:', e);
      });
  }, [videoPath]);

  const renderItem = ({ index, key, style }: any) => {
    const { end, start, subtitles: localSubtitles } = subtitles[index];
    return (
      <List.Item
        key={key}
        style={{ ...style, padding: 0, borderBottom: '2px solid #c4bfbf' }}
      >
        <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
          <Row>
            <Col span={4}>
              <Button
                onClick={() => {
                  player?.setCurrentTime(start);
                  player?.setCurrClipIndex(index);
                }}
              >
                播放
              </Button>
            </Col>
            <Col span={16}></Col>
            <Col span={4}>
              <Button
                onClick={() => {
                  setSubtitles([
                    ...subtitles.slice(0, index),
                    ...subtitles.slice(index + 1),
                  ]);
                }}
              >
                删除
              </Button>
            </Col>
          </Row>
          <Row>
            <Col span={8}>
              <Input
                value={parseInt(start, 10)}
                onChange={(e) => {
                  const changeToValue = parseInt(e.target.value, 10) || 0;
                  setSubtitles(
                    [
                      ...subtitles.slice(0, index),
                      { ...subtitles[index], start: changeToValue },
                      ...subtitles.slice(index + 1),
                    ].sort((a, b) => a.start - b.start)
                  );
                }}
              ></Input>
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
              ----&gt;
            </Col>
            <Col span={8}>
              <Input
                value={parseInt(end, 10)}
                onChange={(e) => {
                  const changeToValue = parseInt(e.target.value, 10) || 0;
                  setSubtitles(
                    [
                      ...subtitles.slice(0, index),
                      { ...subtitles[index], end: changeToValue },
                      ...subtitles.slice(index + 1),
                    ].sort((a, b) => a.start - b.start)
                  );
                }}
              ></Input>
            </Col>
          </Row>
          {localSubtitles.map((s: string) => {
            return (
              <Row key={s}>
                <Col span={24}>
                  <Input value={s}></Input>
                </Col>
              </Row>
            );
          })}
          <Row>
            <Col span={24}>
              <Button
                onClick={() => {
                  const currentSubtitle = subtitles[index];
                  const nextSubtitle = subtitles[index + 1];

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
                  setSubtitles([
                    ...subtitles.slice(0, index),
                    {
                      start: currentSubtitle.start,
                      end: nextSubtitle.end,
                      subtitles: mergeSubtitles,
                    },
                    ...subtitles.slice(index + 2),
                  ]);
                }}
              >
                向下合并
              </Button>
            </Col>
          </Row>
        </div>
      </List.Item>
    );
  };

  return (
    <div
      style={{
        marginTop: '22px',
        display: 'flex',
        height: 'calc(100% - 22px)',
      }}
    >
      <div style={{ flexGrow: 1 }}>
        <Button
          type="primary"
          shape="circle"
          icon={<LeftOutlined />}
          onClick={() => {
            player?.clear();
            navigate('/episode');
          }}
        />
        <div
          id="video-player"
          tabIndex={0}
          onClick={() => {
            if (player === null) {
              return;
            }
            player.togglePause();
          }}
        ></div>
      </div>
      <div style={{ width: '400px', backgroundColor: 'green', height: '100%' }}>
        <div>
          <div>字幕整体调节: </div>
          <div style={{ textAlign: 'center' }}>
            <Row>
              <Col span={6}>步长(毫秒)</Col>
              <Col span={6}>
                <Input
                  value={adjustPace}
                  onChange={(e) => {
                    setAdjustPace(parseInt(e.target.value, 10));
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col span={6}>逐句切换：</Col>
              <Col span={6}>
                <Switch
                  defaultChecked
                  onChange={(checked) => {
                    setBySentence(checked);
                    player?.setPlayByClip(checked);
                  }}
                />
              </Col>
              <Col span={6}>单句循环：</Col>
              <Col span={6}>
                <Switch
                  defaultChecked
                  onChange={(checked) => {
                    setSentenceLoop(checked);
                    player?.setClipLoop(checked);
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <Button
                  style={{ width: '100%' }}
                  onClick={() => {
                    setSubtitles(
                      subtitles.map((s) => {
                        return {
                          ...s,
                          start: s.start - adjustPace,
                          end: s.end - adjustPace,
                        };
                      })
                    );
                  }}
                >
                  前移
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  style={{ width: '100%' }}
                  onClick={() => {
                    setSubtitles(
                      subtitles.map((s) => {
                        return {
                          ...s,
                          start: s.start + adjustPace,
                          end: s.end + adjustPace,
                        };
                      })
                    );
                  }}
                >
                  后移
                </Button>
              </Col>
            </Row>
          </div>
        </div>
        <AutoSizer>
          {({ width, height }) => (
            <VList
              style={{ outline: 'none' }}
              width={width}
              height={height}
              overscanRowCount={10}
              rowCount={subtitles.length}
              rowHeight={200}
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
