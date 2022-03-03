import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Input,
  Button,
  Row,
  Col,
  Breadcrumb,
  Dropdown,
  Popconfirm,
  message,
} from 'antd';
import { Header, Content } from 'antd/lib/layout/layout';
import Sider from 'antd/lib/layout/Sider';
import {
  MoreOutlined,
  NotificationOutlined,
  PlusCircleOutlined,
  SearchOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { promises as fs } from 'fs';
import SubMenu from 'antd/lib/menu/SubMenu';
import PATH from 'path';
import { removeDirectory } from '@m59/remove-directory';
import { useNavigate } from 'react-router-dom';
import { dbRoot } from '../../database/db';
import styles from './Episode.css';
import { Episode, EpisodeItem } from './EpisodeItem';
import { EpisodeList } from './EpisodeList';
import { playVideo$ } from '../../state/user_input/playVideoAction';

const L1 = `${dbRoot}/video_output`;

const loadFileListOfDir = (dir: string, isDirectory: boolean) => {
  return fs
    .readdir(dir)
    .then((files) => {
      return Promise.all(
        files.map(async (file) => {
          const stat = await fs.stat(PATH.join(dir, file));
          if (stat.isDirectory() === isDirectory) {
            return file;
          }
          return '';
        })
      );
    })
    .then((files) => files.filter((file) => file.length > 0))
    .catch((e) => {
      console.log(`load child dirs of ${dir}:`, e);
    });
};

const loadEpisodes = async () => {
  const dirListLevel1 = await loadFileListOfDir(L1, true);
  if (dirListLevel1 === undefined) {
    return;
  }
  let episodes: Episode[] = [];
  for (const dirL1 of dirListLevel1) {
    const episode: Episode = {
      path: PATH.join(L1, dirL1),
      name: dirL1,
      children: [],
    };
    episodes.push(episode);
    const dirListLevel2 = await loadFileListOfDir(PATH.join(L1, dirL1), true);
    if (dirListLevel2 !== undefined) {
      episode.children = dirListLevel2.map((dirname) => ({
        name: dirname,
        path: PATH.join(episode.path, dirname),
      }));
    }
  }
  return episodes;
};

export const EpisodePage = () => {
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [newEpisodeName, setNewEpisodeName] = useState('');
  const [openedEpisodeName, setOpendEpisodeName] = useState('');
  const [openedEpisode, setOpendEpisode] = useState<Episode | null>(null);
  const navigate = useNavigate();

  const openEpisodes = (episode: Episode | null) => {
    if (episode === null) {
      setOpendEpisodeName('');
      setOpendEpisode(null);
    } else {
      setOpendEpisodeName(episode.name);
      setOpendEpisode(episode);
    }
  };

  const loadEpisodesSubprocedure = () => {
    console.log('loadEpisodesSubprocedure................................');
    loadEpisodes()
      .then((episodes) => setEpisodes(episodes || []))
      .catch((e) => {
        console.log('loadEpisodes error:', e);
      });
  };
  useEffect(() => loadEpisodesSubprocedure(), []);

  const addNewEpisode = (parentDir: string, newEpisodeName: string) => {
    if (newEpisodeName === undefined || newEpisodeName === '') {
      return;
    }
    const dir = PATH.join(parentDir, newEpisodeName);
    fs.mkdir(dir)
      .finally(() => {
        loadEpisodesSubprocedure();
        setShowAddEpisode(false);
        setNewEpisodeName('');
      })
      .catch((e) => {
        console.log('mkdir', dir, 'failed:', e);
      });
  };

  console.log('befor render, episodes:', episodes);
  return (
    <div style={{ marginTop: '22px', flexGrow: 1, width: '100%' }}>
      <Layout style={{ height: '100%' }}>
        <Header className="header" style={{ display: 'flex' }}>
          <div style={{ width: '212px', marginRight: '20px' }}>
            <Input prefix={<SearchOutlined />} placeholder="搜索剧集" />
          </div>
          <div>
            <Button
              style={{ marginLeft: '12px' }}
              onClick={() => navigate('/')}
            >
              首页
            </Button>
          </div>
        </Header>
        <Layout>
          <Sider
            style={{
              height: 'calc(100% - 64px)',
              position: 'fixed',
              left: 0,
              backgroundColor: '#fff',
            }}
          >
            <div
              style={{
                paddingBottom: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Row
                style={{
                  height: '30px',
                  backgroundColor: 'rgb(38, 38, 38)',
                  padding: '5px 14px',
                }}
              >
                <Col span={20}>{PATH.basename(L1)} </Col>
                <Col
                  span={4}
                  tabIndex={0}
                  onClick={() => {
                    setShowAddEpisode(true);
                  }}
                  style={{ outline: 'none' }}
                >
                  <PlusCircleOutlined className={styles.Add} />
                </Col>
              </Row>
              <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                <Menu
                  mode="inline"
                  style={{ borderRight: 0 }}
                  openKeys={[openedEpisodeName]}
                >
                  {showAddEpisode && (
                    <Menu.Item>
                      <Row style={{ marginTop: '1px' }}>
                        <Col span={17}>
                          <Input
                            value={newEpisodeName}
                            onChange={(event) => {
                              setNewEpisodeName(event.target.value);
                            }}
                            onBlur={() => {
                              setNewEpisodeName('');
                              setShowAddEpisode(false);
                            }}
                            autoFocus
                            placeholder="请输入新剧集名称"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                addNewEpisode(L1, newEpisodeName);
                              }
                            }}
                          />
                        </Col>
                      </Row>
                    </Menu.Item>
                  )}

                  {episodes.map((ep, index) => {
                    const { name, children, showAdd, path } = ep;
                    const firstLevelTitle = (
                      <Row style={{ minWidth: '180px' }}>
                        <Col span={20}>{name}</Col>
                        <Col
                          span={4}
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          style={{ outline: 'none' }}
                        >
                          <Dropdown
                            trigger={['click']}
                            overlay={
                              <Menu>
                                <Menu.Item
                                  key="0"
                                  onClick={() => {
                                    openEpisodes(ep);
                                    setTimeout(() => {
                                      setEpisodes([
                                        ...episodes.slice(0, index),
                                        {
                                          name,
                                          children,
                                          showAdd: true,
                                          path,
                                        },
                                        ...episodes.slice(
                                          index + 1,
                                          episodes.length
                                        ),
                                      ]);
                                    });
                                  }}
                                >
                                  新增子剧集
                                </Menu.Item>
                                <Menu.Item key="1">修改名称</Menu.Item>
                                <Menu.Item key="2" style={{ color: 'red' }}>
                                  <Popconfirm
                                    title="确定删除？"
                                    onConfirm={() => {
                                      removeDirectory(path)
                                        .then(() => {
                                          message.info('删除成功。');
                                        })
                                        .finally(() => {
                                          loadEpisodesSubprocedure();
                                        })
                                        .catch(() => {
                                          message.error('删除失败。');
                                        });
                                    }}
                                    // onCancel={cancel}
                                    okText="确认"
                                    cancelText="取消"
                                  >
                                    删除
                                  </Popconfirm>
                                </Menu.Item>
                              </Menu>
                            }
                          >
                            <MoreOutlined
                              className="add-new-episode"
                              tabIndex={0}
                            />
                          </Dropdown>
                        </Col>
                      </Row>
                    );
                    const addNewItem = (
                      <Menu.Item key={`${name}_addNew`}>
                        <Input
                          autoFocus
                          placeholder="请输入新剧集名称"
                          onBlur={() => {
                            setNewEpisodeName('');
                            const nextEpisodes = [...episodes];
                            nextEpisodes[index] = {
                              name,
                              children,
                              showAdd: false,
                              path,
                            };
                            setEpisodes(nextEpisodes);
                          }}
                          value={newEpisodeName}
                          onChange={(event) => {
                            setNewEpisodeName(event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              addNewEpisode(path, newEpisodeName);
                            } else if (event.key === 'Esc') {
                              // todo
                            }
                          }}
                        />
                      </Menu.Item>
                    );
                    if (children !== undefined && children.length > 0) {
                      // 有子目录
                      console.log(name, ' 有子目录: ', children);
                      return (
                        <SubMenu
                          key={name}
                          title={firstLevelTitle}
                          onTitleClick={() => {
                            if (openedEpisodeName === name) {
                              openEpisodes(null);
                            } else {
                              openEpisodes(ep);
                            }
                            setTimeout(() => {
                              setEpisodes([
                                ...episodes.slice(0, index),
                                {
                                  name,
                                  children,
                                  showAdd: false,
                                  path,
                                },
                                ...episodes.slice(index + 1, episodes.length),
                              ]);
                            });
                          }}
                        >
                          {children.map((childEp: Episode) => {
                            const { name: childName, path } = childEp;
                            return (
                              <Menu.Item
                                key={`${name}-${childName}`}
                                onClick={() => {
                                  setOpendEpisodeName(ep.name);
                                  setOpendEpisode(childEp);
                                }}
                              >
                                <Row>
                                  <Col span={20}>{childName}</Col>
                                  <Col span={4}>
                                    <Dropdown
                                      trigger={['click']}
                                      overlay={
                                        <Menu>
                                          <Menu.Item key="1">
                                            修改名称
                                          </Menu.Item>
                                          <Menu.Item
                                            key="2"
                                            style={{ color: 'red' }}
                                          >
                                            <Popconfirm
                                              title="确定删除？"
                                              onConfirm={() => {
                                                removeDirectory(path)
                                                  .then(() => {
                                                    message.info('删除成功。');
                                                  })
                                                  .finally(() => {
                                                    loadEpisodesSubprocedure();
                                                  })
                                                  .catch(() => {
                                                    message.error('删除失败。');
                                                  });
                                              }}
                                              // onCancel={cancel}
                                              okText="确认"
                                              cancelText="取消"
                                            >
                                              删除
                                            </Popconfirm>
                                          </Menu.Item>
                                        </Menu>
                                      }
                                    >
                                      <MoreOutlined
                                        className="add-new-episode"
                                        tabIndex={0}
                                      />
                                    </Dropdown>
                                  </Col>
                                </Row>
                              </Menu.Item>
                            );
                          })}
                          {showAdd && addNewItem}
                        </SubMenu>
                      );
                    }
                    if (showAdd) {
                      // 没有子目录，但要显示添加组件。
                      return (
                        <SubMenu key={name} title={name}>
                          {showAdd && addNewItem}
                        </SubMenu>
                      );
                    }
                    return (
                      <Menu.Item
                        key={name}
                        onClick={() => {
                          openEpisodes(ep);
                        }}
                      >
                        {firstLevelTitle}
                      </Menu.Item>
                    );
                  })}
                </Menu>
              </div>
            </div>
          </Sider>
          <Layout style={{ padding: '0 24px 24px', marginLeft: '240px' }}>
            <Content
              className="site-layout-background"
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
              }}
            >
              {openedEpisode !== null && (
                <EpisodeList
                  episode={openedEpisode}
                  onEpisodeOpen={(episode) => {
                    const { isDir } = episode;
                    if (isDir) {
                      setOpendEpisode(episode);
                    } else {
                      playVideo$.next(episode.path);
                      navigate('/video');
                    }
                  }}
                />
              )}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </div>
  );
};
