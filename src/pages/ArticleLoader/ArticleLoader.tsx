import React, { useEffect, useState } from 'react';
import { promises as fs } from 'fs';
import PATH from 'path';
import { Button } from 'antd';
import lineReader from 'line-reader';
import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import { dbRoot } from '../../constant';
import { openSentence$ } from '../../state/user_input/openSentenceAction';

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
const L1 = `${dbRoot}/reading`;

const loadDirsAndArticles = async (dir: string) => {
  console.log('loadDirsAndArticles of dir:', dir);
  const dirs: string[] = [];
  const articles: string[] = [];
  return fs
    .readdir(dir)
    .then(async (files) => {
      for (const file of files) {
        const stat = await fs.stat(PATH.join(dir, file));
        if (stat.isDirectory()) {
          dirs.push(file);
        } else if (file.endsWith('txt')) {
          articles.push(file);
        }
      }
      return {
        dirs,
        articles,
      };
    })
    .catch((e) => {
      console.log(`load child dirs of ${dir}:`, e);
      return {
        dirs,
        articles,
      };
    });
};

type ArticleLoaderProps = {
  onOpenArticle: (filePath: string) => void;
};

export const ArticleLoader = ({ onOpenArticle }: ArticleLoaderProps) => {
  const [dirs, setDirs] = useState<string[]>([]);
  const [articles, _setArticles] = useState([] as string[]);
  const [paths, setPaths] = useState([] as string[]);
  const [firstLines, setFirstLines] = useState([] as string[]);

  const setArticles = async (articles: string[], paths: string[]) => {
    console.log('setArticles, paths:', paths);
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
  const localLoadDirsAndArticles = (paths: string[] = [], dir = '') => {
    console.log('localLoadDirsAndArticles, paths:', paths, ', dir:', dir);
    return loadDirsAndArticles(PATH.join(L1, ...paths, dir))
      .then(({ dirs, articles }) => {
        setDirs(dirs);
        setArticles(articles, [...paths, dir]);
      })
      .catch((e) => {
        console.log('Error initializing the dirs and articles:', e);
      });
  };

  useEffect(() => {
    localLoadDirsAndArticles();
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
          }}
          key={2}
        >
          <Button
            type="text"
            style={{ padding: 0, paddingRight: '14px' }}
            onClick={() => {
              setPaths([]);
              localLoadDirsAndArticles();
            }}
          >
            /
          </Button>
          {paths.map((path, index) => {
            return (
              <Button
                type="text"
                style={{ padding: 0, paddingRight: '14px' }}
                key={path}
                onClick={() => {
                  const nextPaths = paths.slice(0, index + 1);
                  setPaths(nextPaths);
                  localLoadDirsAndArticles(nextPaths);
                }}
              >
                {path}/
              </Button>
            );
          })}
        </div>
      </div>
      {dirs.length > 0 &&
        dirs.map((dir, index) => {
          const openFolder = () => {
            setPaths([...paths, dir]);
            localLoadDirsAndArticles(paths, dir);
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
