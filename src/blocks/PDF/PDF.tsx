import React, { useEffect, useRef, useState } from 'react';
import { Icon, Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { Button, Empty } from 'antd';
import { EditFilled, EditOutlined } from '@ant-design/icons';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';
import { MarkMap, PDFNote } from '../../types/PDFNote';
import {
  pdfNote$,
  openNote$,
} from '../../compontent/FlashCardMaker/FlashCardMaker';
import { useBehavior, useObservable } from '../../state';
import { openPdf$ } from '../../state/user_input/openPdfAction';
import styles from './PDF.css';
import { tapWord$ } from '../../state/user_input/tapWordAction';
import { dbRoot, getAbsolutePath } from '../../constant';
// import { BehaviorSubject } from 'rxjs';

// const isDark$ = new BehaviorSubject();

const nextMarkMap$ = new BehaviorSubject<MarkMap>({});
const markMap$ = nextMarkMap$.pipe(throttleTime(1));

export const PDF = () => {
  const [isDark, setIsDark] = useState(false);
  const [startNote, setStartNote] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [markMap] = useObservable(markMap$, {} as MarkMap);
  const [noteList, setNoteList] = useState<PDFNote[]>([]);
  let [file, setFile] = useBehavior(openPdf$, '');
  file = getAbsolutePath(file);
  const setMarkMap = (markMap: MarkMap) => nextMarkMap$.next(markMap);
  const [documentLoaded, setDocumentLoaded] = useState(false);

  const getValidKeyFromMarkMap = (markMap: MarkMap) => {
    const markKeys = Object.keys(markMap);
    console.log('marKkeys:', markKeys);
    const validKeys = markKeys.filter((key) => {
      return markMap[key] === true;
    });
    console.log('validKeys:', validKeys);
    return validKeys;
  };

  const forEachMark = (
    markMap: MarkMap,
    each: (span: HTMLSpanElement) => void
  ) => {
    const validKeys = getValidKeyFromMarkMap(markMap);
    for (let i = 0; i < validKeys.length; i += 1) {
      const position = validKeys[i];
      console.log('clear mark, position:', position);
      const span = document.querySelector(
        `span[data-position='${position}']`
      ) as HTMLSpanElement | null;
      console.log('clear mark:', span);
      if (span) {
        span.style.background = 'none';
        each(span);
      }
    }
  };

  const clearMark = (markMap: MarkMap) => {
    forEachMark(markMap, (span) => {
      span.style.background = 'none';
    });
  };

  const mark = (markMap: MarkMap) => {
    forEachMark(markMap, (span) => {
      span.style.background = 'yellow';
    });
  };

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    renderToolbar: (ToolBar) => {
      console.log('got markMap in renderToolbar:', markMap);
      return ToolBar({
        children({
          CurrentPageInput,
          GoToFirstPage,
          GoToLastPage,
          GoToNextPage,
          GoToPreviousPage,
          NumberOfPages,
          EnterFullScreen,
          SwitchTheme,
          Zoom,
          ZoomIn,
          ZoomOut,
        }) {
          return (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Button
                  type="text"
                  style={{
                    color: isDark ? '#fff' : '#000',
                  }}
                  onClick={() => {
                    setFile('');
                  }}
                >
                  关闭
                </Button>
                <GoToPreviousPage></GoToPreviousPage>
                <CurrentPageInput></CurrentPageInput>
                <span
                  style={{
                    color: isDark ? '#fff' : '#000',
                    marginRight: '5px',
                  }}
                >
                  /{NumberOfPages()}
                </span>
                <GoToNextPage></GoToNextPage>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ZoomOut></ZoomOut>
                <Zoom levels={[1, 2, 3]}></Zoom>
                <ZoomIn></ZoomIn>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  type="text"
                  style={{
                    color: isDark ? '#fff' : '#000',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={() => {
                    clearMark(markMap);
                    setStartNote(!startNote);
                    console.log('startNote:', startNote);
                    const validKeys = getValidKeyFromMarkMap(markMap);
                    const sortedValidKeys = validKeys.sort((keyA, keyB) => {
                      const [pageIdA, layerIndexA, wordIndexA] =
                        keyA.split('%');
                      let pageIndexA: number | string | undefined = pageIdA
                        .split('-')
                        .pop();
                      if (pageIndexA) {
                        pageIndexA = parseInt(pageIndexA, 10);
                      }
                      const [pageIdB, layerIndexB, wordIndexB] =
                        keyB.split('%');
                      let pageIndexB: number | string | undefined = pageIdB
                        .split('-')
                        .pop();
                      if (pageIndexB) {
                        pageIndexB = parseInt(pageIndexB, 10);
                      }
                      console.log(
                        'sort, pageIndexA:',
                        typeof pageIndexA,
                        pageIndexA
                      );
                      console.log(
                        'sort, pageIndexB:',
                        typeof pageIndexB,
                        pageIndexB
                      );
                      if (
                        typeof pageIndexA === 'number' &&
                        typeof pageIndexB === 'number' &&
                        pageIndexA - pageIndexB !== 0
                      ) {
                        console.log(
                          'sort with pageIndex:',
                          pageIndexA - pageIndexB
                        );
                        return pageIndexA - pageIndexB;
                      }
                      let l =
                        parseInt(layerIndexA, 10) - parseInt(layerIndexB, 10);
                      if (l !== 0) {
                        return l;
                      }
                      let w =
                        parseInt(wordIndexA, 10) - parseInt(wordIndexB, 10);
                      return w;
                    });
                    const mergedStr = sortedValidKeys
                      .map((key) => {
                        const span = document.querySelector(
                          `span[data-position='${key}']`
                        ) as HTMLSpanElement | null;
                        return span?.innerHTML || '';
                      })
                      .join(' ');
                    if (!mergedStr.match(/$\s*^/) && startNote) {
                      setNoteList([
                        {
                          firstKey: validKeys[0],
                          marks: markMap,
                          mergedStr,
                          file: file.slice(dbRoot.length),
                        },
                        ...noteList,
                      ]);
                    }
                    setMarkMap({});
                  }}
                >
                  {startNote ? <EditFilled /> : <EditOutlined />}
                </Button>
                <SwitchTheme>
                  {({ onClick }) => {
                    return (
                      <Button
                        onClick={() => {
                          setIsDark(!isDark);
                          onClick();
                        }}
                        type="text"
                        style={{ color: isDark ? '#fff' : '#000' }}
                      >
                        {isDark ? (
                          <Icon size={16}>
                            <path d="M19.5,15.106l2.4-2.4a1,1,0,0,0,0-1.414l-2.4-2.4V5.5a1,1,0,0,0-1-1H15.106l-2.4-2.4a1,1,0,0,0-1.414,0l-2.4,2.4H5.5a1,1,0,0,0-1,1V8.894l-2.4,2.4a1,1,0,0,0,0,1.414l2.4,2.4V18.5a1,1,0,0,0,1,1H8.894l2.4,2.4a1,1,0,0,0,1.414,0l2.4-2.4H18.5a1,1,0,0,0,1-1Z" />
                            <path d="M10,6.349a6,6,0,0,1,0,11.3,6,6,0,1,0,0-11.3Z" />
                          </Icon>
                        ) : (
                          <Icon size={16}>
                            <path d="M19.491,15.106l2.4-2.4a1,1,0,0,0,0-1.414l-2.4-2.4V5.5a1,1,0,0,0-1-1H15.1L12.7,2.1a1,1,0,0,0-1.414,0l-2.4,2.4H5.491a1,1,0,0,0-1,1V8.894l-2.4,2.4a1,1,0,0,0,0,1.414l2.4,2.4V18.5a1,1,0,0,0,1,1H8.885l2.4,2.4a1,1,0,0,0,1.414,0l2.4-2.4h3.394a1,1,0,0,0,1-1Z" />
                            <path d="M11.491,6c4,0,6,2.686,6,6s-2,6-6,6Z" />
                          </Icon>
                        )}
                      </Button>
                    );
                  }}
                </SwitchTheme>
                <EnterFullScreen></EnterFullScreen>
                <GoToFirstPage></GoToFirstPage>
                <GoToLastPage></GoToLastPage>
              </div>
            </div>
          );
        },
      });
    },
    sidebarTabs: (tabs) => {
      console.log('sideBarTabs:', tabs);
      return [
        ...tabs,
        {
          icon: <EditOutlined></EditOutlined>,
          title: '摘抄',
          content: (
            <div style={{ padding: '0 14px' }}>
              {noteList.map((note, index) => {
                return (
                  <div key={index} style={{ borderBottom: '1px solid #ddd' }}>
                    <Button
                      type="text"
                      style={{ color: 'rgb(6, 62, 166)' }}
                      onClick={() => {
                        pdfNote$.next(note);
                      }}
                    >
                      插入卡片
                    </Button>
                    <Button
                      type="text"
                      style={{ color: 'rgb(6, 62, 166)' }}
                      onClick={() => {
                        note.mergedStr.split(/\s/).forEach((w) => {
                          tapWord$.next(w);
                        });
                      }}
                    >
                      翻译
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
          ),
        },
      ];
    },
  });
  useEffect(() => {
    if (documentLoaded === false) {
      return;
    }
    let markMap: MarkMap = {};
    const sp1 = markMap$.subscribe({
      next(_markMap) {
        clearMark(markMap);
        markMap = _markMap;
        mark(markMap);
      },
    });
    const sp = openNote$.subscribe({
      next(note) {
        console.log('open note:', note);
        if (note?.firstKey) {
          const pageStr = note.firstKey.split('-').pop();
          if (pageStr !== undefined) {
            const pageNumber = parseInt(pageStr, 10);
            defaultLayoutPluginInstance.toolbarPluginInstance.pageNavigationPluginInstance.jumpToPage(
              pageNumber
            );
            setMarkMap(note.marks);
            markMap = note.marks;
          }
        }
      },
    });
    return () => {
      sp.unsubscribe();
      sp1.unsubscribe();
    };
  }, [documentLoaded]);

  useEffect(() => {
    if (wrapperRef.current === null) {
      return;
    }
    const onClick = ({ target }: MouseEvent) => {
      if (target instanceof HTMLSpanElement && target.className === 'word') {
        console.log('target:', target);
        if (target.innerHTML !== '') {
          if (startNote) {
            const { background } = target.style;
            const { position } = target.dataset;
            if (position === undefined) {
              return;
            }
            if (background === 'yellow') {
              target.style.background = 'none';
              const nextMarkMap = { ...markMap, [position]: false };
              console.log('nextMarkMap:', nextMarkMap);
              setMarkMap(nextMarkMap);
            } else {
              target.style.background = 'yellow';
              const nextMarkMap = { ...markMap, [position]: true };
              console.log('nextMarkMap:', nextMarkMap);
              setMarkMap(nextMarkMap);
            }
          } else {
            tapWord$.next(target.innerHTML);
          }
        }
      }
    };
    wrapperRef.current.addEventListener('click', onClick);
    return () => wrapperRef.current?.removeEventListener('click', onClick);
  }, [wrapperRef, startNote, markMap]);

  useEffect(() => {
    console.log('selection effect got markMap:', markMap);
    if (wrapperRef.current === null) {
      return;
    }
    const mouseUp$ = new Subject();
    mouseUp$.pipe(debounceTime(1)).subscribe({
      next() {
        let text = '';
        const selection = window.getSelection();
        if (selection !== null) {
          console.log('selection:', selection);
          if (!startNote) {
            console.log('startNode:', startNote);
            text = selection.toString();
            console.log('text:', text);
            text.split(/\s/).forEach((w) => {
              if (w !== '') {
                tapWord$.next(w);
              }
            });
          } else if (wrapperRef.current !== null) {
            console.log('startNode:', startNote);
            console.log('selection:', selection);
            try {
              const wordSpanList = selection
                .getRangeAt(0)
                .cloneContents()
                .querySelectorAll('span.word');
              for (let i = 0; i < wordSpanList.length; i += 1) {
                let childNode = wordSpanList[i] as HTMLSpanElement;
                if (
                  childNode.innerHTML !== '' &&
                  !childNode.innerHTML.match(/^\s+$/)
                ) {
                  const { position } = childNode.dataset;
                  if (position === undefined) {
                    continue;
                  }
                  const span = wrapperRef.current.querySelector(
                    `span[data-position='${position}']`
                  ) as HTMLSpanElement | null;
                  console.log('span data selector:', span);
                  if (span === null) {
                    continue;
                  }
                  const { background } = span.style;
                  if (background === 'yellow') {
                    span.style.background = 'none';
                    markMap[position] = false;
                  } else {
                    span.style.background = 'yellow';
                    markMap[position] = true;
                  }
                }
              }
              const nextMarkMap = { ...markMap };
              console.log('selection chaged the nextMarkMap:', markMap);
              setMarkMap(nextMarkMap);
            } catch (e) {
              console.log(e);
            }
          }
        }
      },
    });
    const onMouseUp = () => {
      mouseUp$.next('');
    };
    wrapperRef.current.addEventListener('mouseup', onMouseUp);
    const onMouseDown = () => {
      const selection = window.getSelection();
      if (selection !== null) {
        selection.removeAllRanges();
      }
    };
    wrapperRef.current.addEventListener('mousedown', onMouseDown);
    return () => {
      wrapperRef.current?.removeEventListener('mouseup', onMouseUp);
      wrapperRef.current?.removeEventListener('mousedown', onMouseDown);
    };
  }, [wrapperRef, startNote, markMap]);

  console.log('render startNote?', startNote);
  if (file === '') {
    return <Empty description="没有打开的pdf"></Empty>;
  }
  return (
    <div className={styles.pdfWrapper} ref={wrapperRef}>
      <Worker workerUrl="../assets/pdf.worker.min.js">
        <div
          style={{
            height: '750px',
            width: '900px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <Viewer
            fileUrl={file}
            plugins={[
              defaultLayoutPluginInstance,
              {
                onTextLayerRender: ({ ele: page }) => {
                  console.log('page:', page);
                  const pageId = page.dataset.testid;
                  const layerList = page.querySelectorAll(
                    '.rpv-core__text-layer-text'
                  );
                  const len = layerList.length;
                  for (let i = 0; i < len; i += 1) {
                    const layer = layerList[i] as HTMLSpanElement;
                    console.log('layer:', layer);
                    const { innerHTML } = layer;
                    layer.innerHTML = innerHTML
                      .split(' ')
                      .map((word, index) => {
                        const id = `${pageId}%${i}%${index}`;
                        if (markMap[id]) {
                          return `<span class='word' style="background: yellow;" data-position='${id}'>${word}</span>`;
                        }
                        return `<span class='word' data-position='${id}'>${word}</span>`;
                      })
                      .join(' ');
                  }
                },
              },
            ]}
            onDocumentLoad={() => {
              setDocumentLoaded(true);
            }}
          />
        </div>
      </Worker>
    </div>
  );
};
