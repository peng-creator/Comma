import React, { useEffect, useState } from 'react';
import { promises as fs } from 'fs';
import PATH from 'path';
import { Button, Tooltip } from 'antd';
import lineReader from 'line-reader';
import {
  FilePdfFilled,
  FileTextOutlined,
  FolderOutlined,
  VideoCameraFilled,
} from '@ant-design/icons';
import { dbRoot } from '../../constant';
import { openSentence$ } from '../../state/user_input/openSentenceAction';
import { mkdir } from '../../util/mkdir';
import { openPdf$ } from '../../state/user_input/openPdfAction';
import { stringFolder } from '../../util/string_util';

const readOneLineOfTextFile = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    lineReader.open(
      filePath,
      function (
        err: any,
        reader: {
          hasNextLine: () => any;
          nextLine: (arg0: (err: any, line: any) => void) => void;
          close: (arg0: { (err: any): void; (err: any): void }) => void;
        }
      ) {
        if (err) throw err;
        if (reader.hasNextLine()) {
          reader.nextLine(function (err: any, line: any) {
            try {
              if (err) throw err;
              resolve(line);
            } finally {
              reader.close(function (err: any) {
                reject(err);
              });
            }
          });
        } else {
          reader.close(function (err: any) {
            reject(err);
          });
        }
      }
    );
  });
};
const L1 = `${dbRoot}/resource`;
mkdir(L1);

const loadDirChildren = async (dir: string) => {
  console.log('loadDirsAndArticles of dir:', dir);
  const dirs: string[] = [];
  const articles: string[] = [];
  const videos: string[] = [];
  const pdfs: string[] = [];
  return fs
    .readdir(dir)
    .then(async (files) => {
      for (const file of files) {
        const stat = await fs.stat(PATH.join(dir, file));
        if (stat.isDirectory()) {
          dirs.push(file);
        } else if (file.toLowerCase().endsWith('txt')) {
          articles.push(file);
        } else if (file.toLowerCase().endsWith('mp4')) {
          videos.push(file);
        } else if (file.toLowerCase().endsWith('pdf')) {
          pdfs.push(file);
        }
      }
      return {
        dirs,
        articles,
        videos,
        pdfs,
      };
    })
    .catch((e) => {
      console.log(`load child dirs of ${dir}:`, e);
      return {
        dirs,
        articles,
        videos,
        pdfs,
      };
    });
};

type ResourceLoaderProps = {
  onOpenArticle: (filePath: string) => void;
  onOpenVideo: (filePath: string) => void;
};

export const ResourceLoader = ({
  onOpenArticle,
  onOpenVideo,
}: ResourceLoaderProps) => {
  const [dirs, setDirs] = useState<string[]>([]);
  const [articles, _setArticles] = useState([] as string[]);
  const [paths, setPaths] = useState([] as string[]);
  const [firstLines, setFirstLines] = useState([] as string[]);
  const [videos, setVideos] = useState([] as string[]);
  const [pdfs, setPdfs] = useState([] as string[]);

  const setArticles = async (articles: string[], paths: string[]) => {
    articles = articles.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const firstLines = await Promise.all(
      articles.map((article) => {
        const filePath = PATH.join(L1, ...paths, article);
        return readOneLineOfTextFile(filePath)
          .then((line) => {
            console.log('readOneLineOfTextFile, line:', line);
            return `${article}: ${line}`;
          })
          .catch((e) => {
            console.log(
              'readOneLineOfTextFile filePath',
              filePath,
              ' error:',
              e
            );
            return article;
          });
      })
    ).catch((err) => {
      console.log('load first line of text file failed:', err);
      return [] as string[];
    });
    setFirstLines(firstLines);
    _setArticles(articles);
  };
  const localLoadDirChildren = (paths: string[] = [], dir = '') => {
    console.log('localLoadDirChildren, paths:', paths, ', dir:', dir);
    return loadDirChildren(PATH.join(L1, ...paths, dir))
      .then(({ dirs, articles, videos, pdfs }) => {
        setDirs(dirs);
        setArticles(articles, [...paths, dir]);
        setVideos(videos);
        setPdfs(pdfs);
      })
      .catch((e) => {
        console.log('Error initializing the dirs and articles:', e);
      });
  };

  useEffect(() => {
    localLoadDirChildren();
  }, []);

  return (
    <div>
      <div style={{ width: '300px', height: '100%' }} key={1}>
        <div
          style={{
            width: '100%',
            display: 'flex',
            borderBottom: '1px solid #000',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}
          key={2}
        >
          <Button
            type="text"
            style={{ padding: 0, paddingRight: '14px' }}
            onClick={() => {
              setPaths([]);
              localLoadDirChildren();
            }}
          >
            /
          </Button>
          {paths.map((path, index) => {
            return (
              <Tooltip title={path} key={path}>
                <Button
                  type="text"
                  style={{ padding: 0, paddingRight: '14px' }}
                  onClick={() => {
                    const nextPaths = paths.slice(0, index + 1);
                    setPaths(nextPaths);
                    localLoadDirChildren(nextPaths);
                  }}
                >
                  {stringFolder(path, 40)}/
                </Button>
              </Tooltip>
            );
          })}
        </div>
      </div>
      {dirs.length > 0 &&
        dirs.map((dir, index) => {
          const openFolder = () => {
            setPaths([...paths, dir]);
            localLoadDirChildren(paths, dir);
          };
          return (
            <div
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  openFolder();
                }
              }}
              key={`dir${dir}`}
              onClick={openFolder}
              style={{
                display: 'flex',
                alignItems: 'center',
                color: '#000',
                cursor: 'pointer',
                marginTop: '10px',
              }}
            >
              <FolderOutlined />
              <div style={{ marginLeft: '14px' }}>{dir}</div>
            </div>
          );
        })}
      <div style={{ flexGrow: 1 }}>
        {pdfs.map((pdfFile, index) => {
          const openPdf = () => {
            const filePath = PATH.join(L1, ...paths, pdfFile);
            openPdf$.next(filePath);
          };
          return (
            <div
              key={pdfFile}
              style={{
                color: 'black',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                marginTop: '10px',
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  openPdf();
                }
              }}
              onClick={openPdf}
            >
              <FilePdfFilled />
              <div style={{ marginLeft: '14px' }}>{pdfFile}</div>
            </div>
          );
        })}
      </div>
      <div style={{ flexGrow: 1 }}>
        {videos.map((videoFile, index) => {
          const openVideo = () => {
            const filePath = PATH.join(L1, ...paths, videoFile);
            console.log(`open video: ${filePath}`);
            onOpenVideo(filePath);
          };
          return (
            <div
              key={videoFile}
              style={{
                color: 'black',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                marginTop: '10px',
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  openVideo();
                }
              }}
              onClick={openVideo}
            >
              <VideoCameraFilled />
              <div style={{ marginLeft: '14px' }}>{videoFile}</div>
            </div>
          );
        })}
      </div>
      <div style={{ flexGrow: 1 }}>
        {firstLines.length > 0 &&
          articles.length > 0 &&
          firstLines.map((line, index) => {
            const openBook = () => {
              const filePath = PATH.join(L1, ...paths, articles[index]);
              console.log(`open article: ${filePath}`);
              openSentence$.next({
                content: '',
                file: filePath,
                page: 0,
                paragraph: 0,
                index: 0,
              });
              onOpenArticle(filePath);
            };
            return (
              <div
                key={articles[index]}
                style={{
                  color: 'black',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '10px',
                }}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    openBook();
                  }
                }}
                onClick={openBook}
              >
                <FileTextOutlined />
                <div style={{ marginLeft: '14px' }}>{line}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
