import React, { useState, useEffect, useRef, memo } from 'react';
import { promises as fs } from 'fs';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Col,
  Input,
  message,
  Pagination,
  Row,
  Spin,
  Tabs,
  Tooltip,
} from 'antd';
import { useRequest } from 'ahooks';
import tokenizer from 'sbd';
import QueryLinesReader from 'query-lines-reader';
import { LeftCircleFilled, SaveOutlined } from '@ant-design/icons';
import { Dict } from '../../compontent/LeftPanel/Dict';
import { translate } from '../../util/translate';
import { globalKeyDownAction$ } from '../../state/user_input/globalKeyDownAction';
import { WordExplain } from '../../compontent/WordExplain/WordExplain';
import { FlashCardMaker } from '../../compontent/FlashCardMaker/FlashCardMaker';
import { flashCardKeyword$ } from '../../state/user_input/flashCardKeyword';
import { Sentence } from '../../types/Article';
import { openSentence$ } from '../../state/user_input/openSentenceAction';

const readerBuilder = (pageSize = 10) => {
  let reader: QueryLinesReader = null;
  let currentFilePath = '';
  return (bookFilePath: string) => {
    if (bookFilePath !== currentFilePath) {
      currentFilePath = bookFilePath;
      reader = new QueryLinesReader(bookFilePath, {
        currentPage: 0,
        pageSize,
      });
    }
    reader.setMinSizeOfCommand(1000 * 1000 * 1000);
    return reader;
  };
};
const { TabPane } = Tabs;

const PAGE_SIZE = 10;
const getReader = readerBuilder(PAGE_SIZE);

const Component = () => {
  const [articleFilePath, setArticleFilePath] = useState('');
  const navigate = useNavigate();
  const [inputSearchValue, setInputSearchValue] = useState('');
  const [searchContent, setSearchContent] = useState('');
  const [explains, setExplains] = useState<any[]>([]);
  const [totalLines, setTotalLines] = useState(1); // 该书的全部段落数
  const totalPages = Math.ceil(totalLines / PAGE_SIZE);
  console.log('total pages:', totalPages);
  const [currentPage, setCurrentPage] = useState(0);
  const [reader, setReader] = useState<QueryLinesReader | null>(null);
  const [title, setTitle] = useState('');
  const [lines, setLines] = useState([] as string[]);
  const totalParagraph = lines.length;
  const divEl = useRef<HTMLDivElement | null>(null);
  const [focusParagraphIndex, setFocusParagraphIndex] = useState(0);
  const [focusSentenceIndex, setFocusSentenceIndex] = useState(0);
  const [focusLineIndex, setFocusLineIndex] = useState(0);
  const [sentenceToOpen, setSentenceToOpen] = useState<Sentence | null>(null);
  const [focusLastLine, setFocusLastLine] = useState(false);
  const [showTransPop, setShowTransPop] = useState(false);
  const [searchBoxFocused, setSearchBoxFocused] = useState(false);
  const searchBoxRef: any = useRef<Input | null>();
  const [transResult, setTransResult] = useState('');
  const [translateCache, setTranslateCache] = useState({} as any);
  const [tabKey, setTabKey] = useState('collins');
  const [records, setRecords] = useState<Sentence[]>([]);
  let [fontSize, setFontSize] = useState(25);

  const getLineHeight = () => {
    if (divEl.current === null) {
      return 39;
    }
    const span = divEl.current.querySelector(
      'span.sentence>span'
    ) as HTMLSpanElement;
    return (span?.offsetHeight || 28) + 11;
  };

  const { loading: translateLoading, run: _runTranslate } = useRequest(
    translate,
    {
      manual: true,
      onSuccess: ({ trans_result }: any, params: any) => {
        if (trans_result && trans_result.length > 0) {
          const res: string = trans_result[0].dst || '';
          setTransResult(res);
          setTranslateCache({ ...translateCache, [params[0]]: res });
        }
      },
    }
  );
  const [isDragging, setIsDragging] = useState(false);
  const runTranslate = (content: string) => {
    setTransResult('');
    const cache = translateCache[content];
    console.log(
      'translateCache:',
      translateCache,
      'key:',
      content,
      ' cache:',
      cache
    );
    if (cache !== undefined) {
      setTransResult(cache);
      return;
    }
    _runTranslate(content);
  };
  // 获取每段落的行数。
  const getTotalLines = (
    divEl: React.MutableRefObject<HTMLDivElement | null>,
    paragraphIndex: number
  ) => {
    const { current: div } = divEl;
    if (div === null) {
      return 0;
    }
    const { children } = div;
    const currentParagraph: HTMLDivElement = (children as any)[paragraphIndex];
    if (currentParagraph === undefined) {
      return 0;
    }
    console.log('currentOriginSpan height:', currentParagraph.offsetHeight);
    const totalLinesOfParagraph = Math.ceil(
      currentParagraph.offsetHeight / getLineHeight()
    );
    console.log('totalLinesOfParagraph: ', totalLinesOfParagraph);
    return totalLinesOfParagraph;
  };

  // 获取全部段落的行数。
  const getLineCountOfParagraph = (
    lines: string[],
    divEl: React.MutableRefObject<HTMLDivElement | null>
  ) => {
    if (divEl.current !== null) {
      const lineCountOfParagraph = lines.map((line, index) =>
        getTotalLines(divEl, index)
      );
      return lineCountOfParagraph;
    }
    return [];
  };
  const sentencesOfParagraph = lines.map((line) => tokenizer.sentences(line));

  const getPage = (
    reader: QueryLinesReader,
    page: number,
    focusParagraphIndex = 0,
    focusSentenceIndex = 0,
    focusLastLine = false
  ) => {
    console.log(
      'getPage:',
      page,
      ' focusParagraphIndex:',
      focusParagraphIndex,
      'focusSentenceIndex:',
      focusSentenceIndex,
      ' focusLastLine:',
      focusLastLine
    );
    return reader
      .queryLines({
        currentPage: page,
        needTotal: false,
      })
      .then(({ lineList }: any) => {
        console.log(
          'reader queryLines lineList:',
          JSON.stringify(lineList, null, 4)
        );
        setCurrentPage(page);
        const nextLines: string[] = lineList.filter(
          (line: string) => line !== ''
        );
        const sentencesOfParagraph = nextLines.map((line) =>
          tokenizer.sentences(line)
        );
        if (lineList.length > 0) {
          setLines(nextLines);
        }
        if (focusLastLine) {
          setFocusLastLine(true);
        } else {
          setFocusParagraphIndex(focusParagraphIndex);
          setFocusSentenceIndex(focusSentenceIndex);
          setFocusLineIndex(0);
          runTranslate(
            sentencesOfParagraph[focusParagraphIndex][focusSentenceIndex]
          );
        }
      })
      .catch((err: any) => {
        console.log('getPage', page, ', err', err);
      });
  };

  const search = (content: string) => {
    setInputSearchValue(content);
    setSearchContent(content);
    flashCardKeyword$.next(content);
  };

  const getTotlesLineOfPage = (lineCountOfParagraph: number[]) => {
    return lineCountOfParagraph.reduce((acc, curr) => {
      return acc + curr + 1;
    }, 0);
  };

  useEffect(() => {
    console.log(
      'focusLastLine:',
      focusLastLine,
      ' lines:',
      lines,
      ' currentPage:',
      currentPage
    );
    if (focusLastLine) {
      const lastParagraphIndex = lines.length - 1;
      const lastLineSentences = sentencesOfParagraph[lastParagraphIndex];
      const sentencesCount = lastLineSentences.length;
      setFocusParagraphIndex(lastParagraphIndex);
      const lineCount = getTotalLines(divEl, lastParagraphIndex);
      console.log(
        'setFocusParagraphIndex:',
        lastParagraphIndex,
        ' setFocusLineIndex:',
        lineCount - 1
      );
      setFocusSentenceIndex(sentencesCount - 1);
      setFocusLineIndex(lineCount - 1);
      setFocusLastLine(false);
      const lineCountOfParagraph = getLineCountOfParagraph(lines, divEl);
      const totalLinesOfPage = getTotlesLineOfPage(lineCountOfParagraph);
      divEl.current!.scrollTop = totalLinesOfPage * getLineHeight();
    }
  }, [divEl, lines, focusLastLine]);

  const saveProgress = (
    sentencesOfParagraph: string[][],
    focusParagraphIndex: number,
    focusSentenceIndex: number,
    articleFilePath: string,
    currentPage: number,
    records: Sentence[]
  ) => {
    const sentenceToRecord = {
      content: sentencesOfParagraph[focusParagraphIndex][focusSentenceIndex],
      file: articleFilePath,
      page: currentPage,
      paragraph: focusParagraphIndex,
      index: focusSentenceIndex,
    };
    const nextRecords = [...records, sentenceToRecord];
    if (nextRecords.length > 10) {
      nextRecords.shift();
    }
    setRecords(nextRecords);
    const recordFilePath = `${articleFilePath}.record.json`;
    fs.writeFile(recordFilePath, JSON.stringify(nextRecords))
      .then(() => message.success('进度已保存'))
      .catch((e) => {
        console.log('进度保存失败！', e);
        message.error('进度保存失败！');
      });
  };

  const saveProgressOnClick = () =>
    saveProgress(
      sentencesOfParagraph,
      focusParagraphIndex,
      focusSentenceIndex,
      articleFilePath,
      currentPage,
      records
    );

  useEffect(() => {
    const sp = globalKeyDownAction$.subscribe({
      next(key) {
        if (searchBoxFocused) {
          return;
        }
        if (!articleFilePath) {
          return;
        }
        key = key.toLowerCase();
        const lineCountOfParagraph = getLineCountOfParagraph(lines, divEl);
        const totalLinesOfPage = getTotlesLineOfPage(lineCountOfParagraph);
        const totalLinesOfParagraph = lineCountOfParagraph[focusParagraphIndex];

        console.log(
          'focusParagraphIndex:',
          focusParagraphIndex,
          'focusLineIndex:',
          focusLineIndex,
          ' totalLinesOfParagraph:',
          totalLinesOfParagraph
        );
        const sentencesCount = sentencesOfParagraph[focusParagraphIndex].length;
        // 在光标移动到屏幕中央之前，都不加 scrollTop
        let movedLines = 0;
        for (let i = 0; i <= focusParagraphIndex; i += 1) {
          if (i < focusParagraphIndex) {
            movedLines += lineCountOfParagraph[i] + 1; // 加 1 为段落间隙，算作一行
          }
          if (i === focusParagraphIndex) {
            movedLines += focusLineIndex + 1;
          }
        }
        console.log('movedLines:', movedLines);
        const lineHeight = getLineHeight();
        const movedHeight = movedLines * lineHeight;
        const scrollDown = (distance: number) => {
          if (
            divEl.current !== null &&
            movedHeight >= divEl.current.offsetHeight / 2
          ) {
            console.log('保持高亮位于屏幕中间，向下移动滚动条');
            divEl.current.scrollTop += distance;
          }
        };
        const remainHeight = (totalLinesOfPage - movedLines) * lineHeight;
        const scrollUp = (distance: number) => {
          if (
            divEl.current !== null &&
            remainHeight >= divEl.current.offsetHeight / 2
          ) {
            console.log('保持高亮位于屏幕中间，向上移动滚动条');
            divEl.current.scrollTop -= distance;
          }
        };
        if (key === 'j') {
          console.log('jjjjj');
          console.log(
            'focusSentenceIndex:',
            focusSentenceIndex,
            'sentencesCount:',
            sentencesCount
          );

          if (focusSentenceIndex + 1 >= sentencesCount) {
            // 段落尾部
            const nextFocusParagraphIndex = focusParagraphIndex + 1;
            if (nextFocusParagraphIndex >= totalParagraph) {
              console.log('已经移动到本页末尾，打开下一页');
              if (currentPage + 1 >= totalPages) {
                return;
              }
              getPage(reader, currentPage + 1);
              if (divEl.current !== null) {
                divEl.current.scrollTop = 0;
              }
              return;
            }
            console.log(
              '移动到下个段落的行首, nextFocusParagraphIndex:',
              nextFocusParagraphIndex
            );
            setFocusParagraphIndex(nextFocusParagraphIndex);
            setFocusLineIndex(0);
            setFocusSentenceIndex(0);
            scrollDown(lineHeight * 2);
            setShowTransPop(true);
            runTranslate(sentencesOfParagraph[nextFocusParagraphIndex][0]);
            return;
          }
          console.log('移动到当前段落的下一行');
          setFocusLineIndex(
            focusLineIndex + totalLinesOfParagraph / sentencesCount
          );
          setFocusSentenceIndex(focusSentenceIndex + 1);
          console.log(
            'scrollDown:',
            'lineHeight',
            lineHeight,
            'totalLinesOfParagraph',
            totalLinesOfParagraph,
            'sentencesCount',
            sentencesCount
          );
          scrollDown((lineHeight * totalLinesOfParagraph) / sentencesCount);
          runTranslate(
            sentencesOfParagraph[focusParagraphIndex][focusSentenceIndex + 1]
          );
        } else if (key === 'k') {
          console.log('kkkkk');
          if (focusSentenceIndex === 0) {
            // 段落首部
            const nextFocusParagraphIndex = focusParagraphIndex - 1;
            if (nextFocusParagraphIndex < 0) {
              console.log('已经移动到本页头部，打开上一页');
              getPage(reader, currentPage - 1, 0, 0, true);
              return;
            }
            console.log(
              '移动到上个段落的行尾, nextFocusParagraphIndex:',
              nextFocusParagraphIndex
            );
            setFocusParagraphIndex(nextFocusParagraphIndex);
            const totalLines = lineCountOfParagraph[nextFocusParagraphIndex];
            const sentencesCount =
              sentencesOfParagraph[nextFocusParagraphIndex].length;
            setFocusLineIndex(
              totalLines - totalLinesOfParagraph / sentencesCount
            );
            setFocusSentenceIndex(sentencesCount - 1);
            scrollUp(lineHeight * 2);
            runTranslate(
              sentencesOfParagraph[nextFocusParagraphIndex][sentencesCount - 1]
            );
            return;
          }
          console.log('移动到当前段落的上一行');
          setFocusLineIndex(
            focusLineIndex - totalLinesOfParagraph / sentencesCount
          );
          setFocusSentenceIndex(focusSentenceIndex - 1);
          runTranslate(
            sentencesOfParagraph[focusParagraphIndex][focusSentenceIndex - 1]
          );
          scrollUp((lineHeight * totalLinesOfParagraph) / sentencesCount);
        } else if (key === 'l') {
          console.log('llllll');
          if (currentPage + 1 >= totalPages) {
            console.log('已经到最后一页.');
            return;
          }
          console.log('翻到下一页:', currentPage + 1);
          getPage(reader, currentPage + 1);
          divEl.current!.scrollTop = 0;
        } else if (key === 'h') {
          console.log('hhhhhh');
          if (currentPage === 0) {
            return;
          }
          getPage(reader, currentPage - 1);
          divEl.current!.scrollTop = 0;
        } else if (key === 't') {
          if (translateLoading) {
            return;
          }
          setShowTransPop(true);
          runTranslate(
            sentencesOfParagraph[focusParagraphIndex][focusSentenceIndex]
          );
        } else if (key === '/' && searchBoxRef.current !== null) {
          setTimeout(() => {
            searchBoxRef.current.focus();
            setSearchBoxFocused(true);
            setInputSearchValue('');
          });
        } else if (key === 's') {
          search(sentencesOfParagraph[focusParagraphIndex][focusSentenceIndex]);
        } else if (key === 'p') {
          search(sentencesOfParagraph[focusParagraphIndex].join(''));
        } else if (key === 'u') {
          saveProgress(
            sentencesOfParagraph,
            focusParagraphIndex,
            focusSentenceIndex,
            articleFilePath,
            currentPage,
            records
          );
        }
      },
    });
    return () => sp.unsubscribe();
  }, [
    divEl,
    focusLineIndex,
    focusSentenceIndex,
    totalParagraph,
    focusParagraphIndex,
    reader,
    currentPage,
    lines,
    translateLoading,
    totalPages,
    searchBoxRef.current,
    searchBoxFocused,
    sentencesOfParagraph,
    translateCache,
    records,
  ]);

  const loadRecords = (articleFilePath: string): Promise<Sentence[]> => {
    const recordFilePath = `${articleFilePath}.record.json`;
    return fs
      .readFile(recordFilePath)
      .then((content) => {
        return JSON.parse(content.toString()) as Sentence[];
      })
      .catch(() => {
        console.log('加载进度失败。');
        return [];
      });
  };

  const openArticle = (
    articleFilePath: string,
    page = 0,
    paragraphIndex = 0,
    sentenceIndex = 0
  ) => {
    setArticleFilePath(articleFilePath);
    const reader = getReader(articleFilePath);
    setReader(reader);
    reader
      .queryLines({
        start: 0,
        end: 1,
      })
      .then(({ lineList }: any) => {
        if (lineList.length > 0) {
          setTitle(lineList[0]);
        }
      })
      .catch((err: any) => {
        console.log('get title error', err);
      });
    reader
      .getTotal()
      .then((totalLines: any) => {
        setTotalLines(totalLines);
      })
      .catch((err: any) => {
        console.log('reader.getTotal() err:', err);
      });
    return getPage(reader, page, paragraphIndex, sentenceIndex);
  };
  console.log('rendering: sentence to open: ', sentenceToOpen);

  useEffect(() => {
    const sp = openSentence$.subscribe({
      next(sentence) {
        if (sentence === null) {
          return;
        }
        const { file, page, paragraph, index } = sentence;
        if (page === 0 && paragraph === 0 && index === 0) {
          loadRecords(file)
            .then((nextRecords) => {
              setRecords(nextRecords);
              const { file, page, paragraph, index } =
                nextRecords[nextRecords.length - 1];
              openArticle(file, page, paragraph, index);
            })
            .catch((e) => {
              openArticle(file, page, paragraph, index);
            });
        } else {
          openArticle(file, page, paragraph, index);
        }
      },
    });
    return () => sp.unsubscribe();
  }, []);

  const wordOfLine = (word: string, index: number) => {
    return (
      <span
        key={index}
        onClick={() => search(word.replace(/[^a-zA-Z-]/g, ''))}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            search(word);
          }
        }}
        style={{ cursor: 'pointer', outline: 'none', paddingRight: '3px' }}
      >
        {` ${word} `}
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: 'rgb(30, 30, 35)',
        flexGrow: 1,
      }}
    >
      <div
        style={{
          width: '600px',
          height: '100%',
          padding: '20px',
          marginLeft: '14px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '50%',
          }}
          onDrop={(e) => {
            console.log('onDrop setIsDragging(false)');
            const sentence = e.dataTransfer.getData('search');
            if (sentence) {
              search(sentence);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
        >
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.8)',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#000',
                fontSize: '30px',
              }}
            >
              拖放到此处翻译
            </div>
          )}
          <div style={{ fontSize: '24px', marginBottom: '14px' }}>
            <Input
              ref={searchBoxRef}
              type="text"
              value={inputSearchValue}
              onChange={(e) => {
                setInputSearchValue(e.target.value);
              }}
              style={{
                backgroundColor: 'rgb(30, 30, 35)',
                color: 'rgb(100, 100, 100)',
              }}
              onFocus={() => {
                console.log('setSearchBoxFocused true');
                setSearchBoxFocused(true);
              }}
              onKeyDown={(e) => {
                const key = e.key.toLowerCase();
                if (key === 'escape'.toLowerCase()) {
                  searchBoxRef.current.blur();
                  setSearchBoxFocused(false);
                } else if (key === 'enter'.toLowerCase()) {
                  search(inputSearchValue);
                  searchBoxRef.current.blur();
                }
              }}
              onBlur={() => {
                setSearchBoxFocused(false);
              }}
              placeholder="查询词典"
            />
          </div>
          <Tabs
            activeKey={tabKey}
            style={{ color: 'white' }}
            onChange={(key) => setTabKey(key)}
          >
            <TabPane tab="柯林斯" key="collins"></TabPane>
            <TabPane tab="有道" key="youdao"></TabPane>
          </Tabs>
          <div style={{ height: 'calc(100% - 120px)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                overflowY: 'auto',
                display: tabKey === 'collins' ? 'block' : 'none',
              }}
            >
              <WordExplain
                searchWord={searchContent}
                onGetExplains={(explains: any[]) => {
                  console.log('onGetExplains:', explains);
                  setExplains(explains);
                  if (explains.length === 0) {
                    setTabKey('youdao');
                  } else {
                    setTabKey('collins');
                  }
                }}
              ></WordExplain>
            </div>

            <Dict
              style={{
                display: tabKey === 'youdao' && !isDragging ? 'block' : 'none',
              }}
              searchWord={searchContent}
            ></Dict>
          </div>
        </div>
        <div style={{ flexGrow: 1 }}>
          <FlashCardMaker></FlashCardMaker>
        </div>
      </div>
      <div
        style={{
          width: '800px',
          height: '100%',
          overflowX: 'hidden',
          color: 'rgb(225, 216, 216)',
          fontFamily:
            'PublicoText,Georgia,Publico Text,Times New Roman,Times,Baskerville',
          whiteSpace: 'normal',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: 'calc(100% - 100px)',
            paddingLeft: '28px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: '40px',
              marginBottom: '10px',
            }}
          >
            <Button
              type="text"
              style={{ fontSize: '40px', color: 'white' }}
              onClick={() => navigate('/')}
            >
              <LeftCircleFilled />
            </Button>
            {title.split(' ').map(wordOfLine)}
          </div>
          <div
            style={{
              fontSize: `${fontSize}px`,
              flexGrow: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '14px',
              color: 'rgb(100, 100, 100)',
            }}
            ref={divEl}
          >
            {sentencesOfParagraph.map((sentences, paragraphIndex) => {
              return (
                <div
                  key={paragraphIndex}
                  style={{
                    position: 'relative',
                    marginBottom: `${getLineHeight()}px`,
                    padding: '0 14px',
                  }}
                  onDoubleClick={() => {
                    search(sentences.join(' '));
                  }}
                >
                  <span
                    className="original"
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      paddingBottom: '11px',
                    }}
                  >
                    {sentences.map((sentence, sentenceIndex) => {
                      const selected =
                        focusParagraphIndex === paragraphIndex &&
                        sentenceIndex === focusSentenceIndex;
                      const Title = () => {
                        if (translateLoading) {
                          return <Spin></Spin>;
                        }
                        return (
                          <span style={{ fontSize: '20px' }}>
                            {transResult}
                          </span>
                        );
                      };
                      return (
                        <Tooltip
                          key={sentence + sentenceIndex}
                          title={Title}
                          visible={
                            selected &&
                            showTransPop &&
                            (transResult !== '' || translateLoading)
                          }
                        >
                          <span
                            className="sentence"
                            style={{
                              background: selected ? 'black' : 'none',
                              color: selected ? 'rgb(202, 165, 42)' : 'inherit',
                            }}
                            draggable
                            onDragStart={(e) => {
                              setIsDragging(true);
                              e.dataTransfer.setData(
                                'sentence',
                                JSON.stringify({
                                  content: sentence,
                                  file: articleFilePath,
                                  page: currentPage,
                                  paragraph: paragraphIndex,
                                  index: sentenceIndex,
                                } as Sentence)
                              );
                              e.dataTransfer.setData('search', sentence);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setIsDragging(false);
                            }}
                          >
                            {sentence.split(' ').map(wordOfLine)}
                          </span>
                        </Tooltip>
                      );
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: '5px',
            width: '100%',
            zIndex: 2,
            cursor: 'pointer',
            padding: '0 25px',
          }}
        >
          <Row>
            <Col span={5} style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                onClick={() => {
                  let _fontSize = fontSize - 5;
                  if (fontSize < 15) {
                    _fontSize = 15;
                  }
                  setFontSize(_fontSize);
                }}
              >
                -
              </Button>
              <span style={{ margin: '0 14px', fontSize: '30px' }}>A</span>
              <Button
                onClick={() => {
                  let _fontSize = fontSize + 5;
                  if (fontSize > 100) {
                    _fontSize = 100;
                  }
                  setFontSize(_fontSize);
                }}
              >
                +
              </Button>
            </Col>
            <Col span={5}>
              <div
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key.toLowerCase() === 'enter') {
                    saveProgressOnClick();
                  }
                }}
                onClick={saveProgressOnClick}
                style={{
                  fontSize: '40px',
                }}
              >
                <SaveOutlined />
              </div>
            </Col>
          </Row>
        </div>
        <div
          style={{
            height: '100px',
            padding: '0px 28px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '14px',
              top: '10px',
              fontSize: '20px',
            }}
            className="readingPagination"
          >
            <Pagination
              simple
              current={currentPage + 1}
              total={totalLines}
              onChange={(pageNumber: number) => {
                getPage(reader, pageNumber - 1);
                if (pageNumber !== currentPage && divEl.current !== null) {
                  divEl.current.scrollTop = 0;
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export const Article = memo(Component);
