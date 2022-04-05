import React, { useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import { Button, Empty, message, Modal, Pagination } from 'antd';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TextItem } from 'react-pdf';
import tokenizer from 'sbd';
import styles from './PDF.css';
import { useBehavior } from '../../state';
import { tapWord$ } from '../DictAndCardMaker/DictAndCardMaker';
import {
  openNote$,
  pdfNote$,
} from '../../compontent/FlashCardMaker/FlashCardMaker';
import { MarkMap, PDFNote } from '../../types/PDFNote';

const wordClick$ = new Subject<React.MouseEvent<HTMLSpanElement, MouseEvent>>();

wordClick$.pipe(debounceTime(200)).subscribe({
  next: (e) => {
    switch (e.detail) {
      case 1:
        console.log('click');
        break;
      case 2:
        console.log('double click');
        break;
      case 3:
        console.log('triple click');
        break;
      default:
    }
  },
});

export const pdfWidth$ = new BehaviorSubject(0);

export const openPdf$ = new BehaviorSubject<string>('');

const textCache = {
  prev: '',
  current: '',
  next: '',
};

const pageText$ = new Subject<string>();

// pageIndex - itemIndex - wordIndex, 可以唯一确定一个单词
export const PDF = ({ onClose }: { onClose: () => void }) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfFilePath, setPdfFilePath] = useBehavior(openPdf$, '');
  const [startNote, setStartNote] = useState(false);
  const [startMarking, setStartMarking] = useState(false);
  const [markMap, setMarkMap] = useState<MarkMap>({});
  const [noteList, setNoteList] = useState<PDFNote[]>([]);
  const [text, setText] = useState('');
  const [showText, setShowText] = useState(false);
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    const sp = pageText$.pipe(debounceTime(200)).subscribe({
      next: () => {
        setText(textCache.current);
      },
    });
    return () => sp.unsubscribe();
  }, []);

  useEffect(() => {
    const sp = openNote$.subscribe({
      next(note) {
        if (note === null || note.file === undefined) {
          return;
        }
        setStartNote(false);
        setMarkMap(note.marks);
        console.log('setPdfFilePath:', note.file);
        setPdfFilePath(note.file);
        const page = parseInt(note.firstKey.split('-')[0], 10);
        setPageNumber(page);
      },
    });
    return () => sp.unsubscribe();
  }, []);

  console.log('numPages:', numPages);
  console.log('pdf file path:', pdfFilePath);
  if (pdfFilePath === '') {
    return <Empty description="没有打开的pdf文件"></Empty>;
  }
  const getPageText = (pageItems: TextItem[]) => {
    return pageItems
      .reduce((acc, curr) => {
        return acc + curr.str;
      }, '')
      .replaceAll('\t', ' ');
  };
  return (
    <div
      className={styles.PDFWrapper}
      onMouseDown={() => {
        setStartMarking(true);
        console.log('start marking:', true);
      }}
      onMouseUp={() => {
        setStartMarking(false);
        console.log('start marking:', false);
      }}
    >
      <div className={styles.operations}>
        <div>
          <Button
            onClick={() => {
              const markedKeys = Object.keys(markMap);
              if (startNote && markedKeys.length > 0) {
                message.info('已暂存摘录，可点击`显示摘录`按钮进行查看');
                const sortedKeys = markedKeys.sort((a, b) => {
                  const [pa, ia, wa] = a.split('-').map((w) => parseInt(w, 10));
                  const [pb, ib, wb] = b.split('-').map((w) => parseInt(w, 10));
                  let p = pa - pb;
                  let i = ia - ib;
                  let w = wa - wb;
                  if (p !== 0) {
                    return p;
                  }
                  if (i !== 0) {
                    return i;
                  }
                  if (w !== 0) {
                    return w;
                  }
                  return 0;
                });
                console.log('sortedKeys:', sortedKeys);
                const mergedStr = sortedKeys
                  .map((key) => {
                    return markMap[key];
                  })
                  .join(' ');
                setNoteList([
                  {
                    firstKey: sortedKeys[0],
                    mergedStr,
                    marks: markMap,
                    file: pdfFilePath,
                  },
                  ...noteList,
                ]);
              } else if (!startNote) {
                message.info('开始摘录：请点击文字进行标记');
              }
              setStartNote(!startNote);
              setMarkMap({});
            }}
          >
            {startNote ? '结束摘录' : '摘录'}
          </Button>
          <Button
            onClick={() => {
              setShowNote(true);
            }}
          >
            显示摘录
          </Button>
          <Button
            onClick={() => {
              setShowText(true);
            }}
          >
            提取 PDF 文本
          </Button>
          <Button
            onClick={() => {
              onClose();
            }}
          >
            退出
          </Button>
        </div>
        <div className="readingPagination" style={{ padding: '14px' }}>
          <Pagination
            simple
            current={pageNumber}
            total={numPages * 10}
            onChange={(pageNumber: number) => {
              setPageNumber(pageNumber);
            }}
          />
        </div>
      </div>
      <Document
        file={pdfFilePath}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
        }}
      >
        <Page
          pageNumber={pageNumber}
          renderMode="svg"
          scale={1.5}
          onGetTextSuccess={(items) => {
            textCache.current = getPageText(items);
            pageText$.next('');
          }}
          onLoadSuccess={() => {
            const pageDiv: HTMLDivElement | null = document.querySelector(
              `.react-pdf__Page__svg`
            );
            if (pageDiv !== null) {
              pdfWidth$.next(pageDiv.clientWidth);
              // wrapper.style.width = `${wrapper.clientWidth}px`;
              // wrapper.style.height = `${wrapper.clientHeight}px`;
            }
          }}
          customTextRenderer={(layer) => {
            return (
              <>
                {layer.str.split(/\s/).map((w, index) => {
                  if (w === '') {
                    return ' ';
                  }
                  const key = `${pageNumber}-${layer.itemIndex}-${index}`;
                  const marked = markMap[key] !== undefined;
                  const checkMark = () => {
                    setMarkMap({
                      ...markMap,
                      [key]: marked ? undefined : w,
                    });
                  };
                  const endWithNoneWord = w.match(/\w*\W$/);
                  if (endWithNoneWord) {
                    console.log('endWithNoneWord:', w);
                  }
                  return (
                    <span
                      className={styles.word}
                      style={
                        markMap[key]
                          ? { background: 'rgba(6, 62, 166, .5)' }
                          : {}
                      }
                      key={index}
                      tabIndex={0}
                      onKeyDown={() => {}}
                      onMouseDown={() => {
                        if (startNote) {
                          checkMark();
                          return;
                        }
                        tapWord$.next(w);
                      }}
                      onClick={(e) => {
                        wordClick$.next(e);
                        console.log('layer txt:', layer.str);
                      }}
                      onMouseEnter={() => {
                        if (startMarking && startNote) {
                          console.log(
                            'word mouse enter, layer:',
                            layer,
                            ' wordIndex:',
                            index
                          );
                          checkMark();
                        }
                      }}
                    >
                      {w}
                    </span>
                  );
                })}
              </>
            );
          }}
        />
        <div style={{ display: 'none' }}>
          {pageNumber > 1 && (
            <Page
              pageNumber={pageNumber - 1}
              onGetTextSuccess={(items) => {
                console.log(pageNumber - 1, 'onGetTextSuccess:', items);
                textCache.prev = getPageText(items);
                pageText$.next('');
              }}
            />
          )}
          {pageNumber < numPages && (
            <Page
              pageNumber={pageNumber + 1}
              onGetTextSuccess={(items) => {
                console.log(pageNumber + 1, 'onGetTextSuccess:', items);
                textCache.next = getPageText(items);
                pageText$.next('');
              }}
            />
          )}
        </div>
      </Document>
      <Modal
        title="文本内容"
        visible={showText}
        onOk={() => {
          setShowText(false);
        }}
        onCancel={() => {
          setShowText(false);
        }}
        width={800}
      >
        <div className={styles.text}>
          {tokenizer.sentences(text).map((p, index) => {
            return <p key={index}>{p}</p>;
          })}
        </div>
      </Modal>
      <Modal
        title="摘录"
        visible={showNote}
        onOk={() => {
          setShowNote(false);
        }}
        onCancel={() => {
          setShowNote(false);
        }}
        width={800}
      >
        <div className={styles.note}>
          {noteList.map((note, index) => {
            return (
              <div key={index}>
                <Button
                  type="text"
                  style={{ color: 'rgb(6, 62, 166)' }}
                  onClick={() => {
                    pdfNote$.next(note);
                  }}
                >
                  插入卡片
                </Button>
                {note.mergedStr}
                <Button
                  type="text"
                  style={{ color: 'rgb(243, 90, 90)' }}
                  onClick={() => {
                    setNoteList(noteList.filter((n) => n !== note));
                  }}
                >
                  删除
                </Button>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
