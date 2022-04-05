import React, { useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import PATH from 'path';
import { Button, Empty, Pagination } from 'antd';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TextItem } from 'react-pdf';
import { dbRoot } from '../../database/db';
import styles from './PDF.css';
import { useBehavior } from '../../state';
import { tapWord$ } from '../DictAndCardMaker/DictAndCardMaker';

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

pageText$.pipe(debounceTime(200)).subscribe({
  next: () => {},
});
// pageIndex - itemIndex - wordIndex, 可以唯一确定一个单词
export const PDF = () => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfFilePath] = useBehavior(openPdf$, '');
  const [startNote, setStartNote] = useState(false);
  const [startMarking, setStartMarking] = useState(false);
  const [markMap, setMarkMap] = useState<any>({});
  const [noteList, setNoteList] = useState<any[]>([]);

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
                  const key = `${pageNumber}-${layer.itemIndex}-${index}`;
                  const marked = markMap[key] !== undefined;
                  const checkMark = () => {
                    setMarkMap({
                      ...markMap,
                      [key]: marked ? undefined : w,
                    });
                  };
                  return (
                    <span
                      className={styles.word}
                      style={{
                        background: markMap[key]
                          ? 'rgba(6, 62, 166, 0.5)'
                          : 'none',
                      }}
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
      <div className="readingPagination" style={{ padding: '14px' }}>
        <Pagination
          simple
          current={pageNumber}
          total={numPages * 10}
          onChange={(pageNumber: number) => {
            setPageNumber(pageNumber);
          }}
        />
        <Button
          type="ghost"
          onClick={() => {
            if (startNote) {
              const sortedKeys = Object.keys(markMap).sort((a, b) => {
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
                ...noteList,
                {
                  firstKey: sortedKeys[0],
                  mergedStr,
                  marks: markMap,
                },
              ]);
            }
            setStartNote(!startNote);
            setMarkMap({});
          }}
          style={{
            color: 'white',
            outline: 'none',
          }}
        >
          {startNote ? '完成摘录' : '摘录'}
        </Button>
      </div>
      <div className={styles.note}>
        {noteList.map((note, index) => {
          return <div key={index}>{note.mergedStr}</div>;
        })}
      </div>
    </div>
  );
};
