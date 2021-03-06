import React, { useEffect, useRef, useState } from 'react';
import fs from 'fs';
import WebViewer, { WebViewerInstance } from '@pdftron/webviewer';
import path from 'path';
import { openPdf$ } from '../../state/user_input/openPdfAction';
import { dbRoot, getAbsolutePath } from '../../constant';
import { useBehavior } from '../../state';
import { tapWord$, searchSentence } from '../../state/user_input/tapWordAction';
import {
  openNote$,
  pdfNote$,
} from '../../compontent/FlashCardMaker/FlashCardMaker';

function saveBlob(blob: Blob, file: string) {
  let reader = new FileReader();
  reader.onload = function () {
    if (reader.readyState === 2 && reader.result !== null) {
      let buffer = Buffer.from(reader.result);
      fs.writeFile(file, buffer, () => {});
    }
  };
  reader.readAsArrayBuffer(blob);
}

export const PDFView = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  const instanceRef = useRef<WebViewerInstance | null>(null);

  const [inited, setInited] = useState(false);

  useEffect(() => {
    if (ref.current !== null) {
      WebViewer(
        {
          path: 'pdftron', // point to where the files you copied are served from
          initialDoc: '',
        },
        ref.current
      ).then((i) => {
        instanceRef.current = i;
        setInited(true);
      });
    }
  }, [ref]);

  useEffect(() => {
    if (!inited) {
      return;
    }
    const instance = instanceRef.current;
    if (instance === null) {
      return;
    }

    let relativeFile = '';
    let loaded = false;
    let selectedText = '';

    const sp1 = openPdf$.subscribe({
      next(nextFile) {
        if (relativeFile === nextFile) {
          console.log('PDFView: open the same file:', nextFile);
          return;
        }
        console.log('PDFView: is opening a same file? false :', nextFile);
        if (nextFile) {
          relativeFile = nextFile;
          const { UI } = instance;
          console.log('PDFView: open pdf file:', nextFile);
          loaded = false;
          UI.loadDocument(getAbsolutePath(nextFile));
        }
      },
    });
    const sp2 = openNote$.subscribe({
      next(note) {
        if (!note) {
          return;
        }
        if (!note.file) {
          return;
        }
        const { documentViewer } = instance.Core;
        console.log('note firstKey:', note.firstKey);
        const matchResult = note.firstKey.split('%')[0].match(/-?(\d+)$/);
        if (matchResult === null) {
          return;
        }
        const page = parseInt(matchResult[1], 10) + 1; // ?????????????????????pdf???????????????note fisrtkey???????????? xxxx-10%2%3, 10???pageNumber???2 ????????????3????????????????????????index
        if (!loaded) {
          documentViewer.addEventListener(
            'documentLoaded',
            () => {
              console.log('open page:', page);
              documentViewer.setCurrentPage(page, false);
              loaded = true;
            },
            { once: true }
          );
        } else {
          documentViewer.setCurrentPage(page, false);
        }
      },
    });

    const { documentViewer, annotationManager } = instance.Core;

    instance.UI.annotationPopup.add([
      {
        type: 'actionButton',
        img: 'icon-header-zoom-in-line',
        onClick: (...args: any[]) => {
          console.log('args:', args);
          // cb((f1, f2) => {
          //   // console.log('f1:', f1());
          //   console.log('f2:', f2());
          // });
          const annotations = annotationManager.getSelectedAnnotations();
          for (const a of annotations) {
            pdfNote$.next({
              firstKey: `${a.getPageNumber() - 1}`,
              mergedStr: a.getCustomData('trn-annot-preview'),
              file: relativeFile,
              id: a.Id,
              marks: {},
            });
          }
        },
        dataElement: 'addNote',
      },
    ]);

    // Add header button that will get file data on click
    instance.UI.setHeaderItems((header) => {
      console.log('header items:', header.getItems());
      header.delete('toggleNotesButton');
      header.push({
        type: 'actionButton',
        img: 'icon-close',
        onClick: () => {
          openPdf$.next('');
        },
      });
    });
    let isAnnotationAutoSelected = false;
    annotationManager.addEventListener(
      'annotationChanged',
      async (annotations, action) => {
        if (action === 'add') {
          // ????????????????????????
          isAnnotationAutoSelected = true;
        }
        if (action === 'add' || action === 'delete') {
          const doc = documentViewer.getDocument();
          const xfdfString = await annotationManager.exportAnnotations();
          const data = await doc.getFileData({
            // saves the document with annotations in it
            xfdfString,
          });
          const arr = new Uint8Array(data);
          const blob = new Blob([arr], { type: 'application/pdf' });
          console.log('blob:', blob);
          saveBlob(blob, getAbsolutePath(relativeFile));
        }
      }
    );
    let mouseDownTime = 0;
    let clickTime = 0;
    documentViewer.addEventListener('mouseLeftUp', (evt) => {
      clickTime = Date.now().valueOf() - mouseDownTime;
      if (selectedText !== '') {
        searchSentence(selectedText);
        selectedText = '';
      }
    });
    documentViewer.addEventListener('mouseLeftDown', (evt) => {
      mouseDownTime = Date.now().valueOf();
      selectedText = '';
    });
    let clickTimer: any = null;
    documentViewer.addEventListener('click', (evt) => {
      if (clickTime > 300) {
        return;
      }
      if (clickTimer !== null) {
        clearTimeout(clickTimer);
      }
      clickTimer = setTimeout(() => {
        const { pageNumber, x, y } =
          documentViewer.getViewerCoordinatesFromMouseEvent(evt);
        const document = documentViewer.getDocument();
        // eslint-disable-next-line promise/no-nesting
        document
          .getTextByPageAndRect(
            pageNumber,
            instance.Core.Math.Rect.createFromDimensions(x, y, 1, 2)
          )
          .then((word) => {
            if (word.trim().length > 0) {
              tapWord$.next(word.trim().split(/\s/)[0]);
            }
          });
      }, 300);
    });

    annotationManager.addEventListener(
      'annotationSelected',
      (annotations, action) => {
        if (action === 'selected') {
          if (isAnnotationAutoSelected) {
            isAnnotationAutoSelected = false; // add annotation????????????????????????????????????
            return;
          }
          console.log('annotation selection');
          // ????????????????????????????????????
          clearTimeout(clickTimer);
          setTimeout(() => {
            clearTimeout(clickTimer);
          }, 1);
          const annotations = annotationManager.getSelectedAnnotations();
          const selectedText =
            annotations[annotations.length - 1].getCustomData(
              'trn-annot-preview'
            );
          searchSentence(selectedText);
        } else if (action === 'deselected') {
          console.log('annotation deselection');
        }
      }
    );

    documentViewer.addEventListener(
      'textSelected',
      (quads, selectedContent, pageNumber) => {
        // quads will be an array of 'Quad' objects
        // text is the selected text as a string
        if (selectedContent.length > 0) {
          selectedText = selectedContent;
        }
      }
    );
    return () => {
      instance.UI.closeDocument();
      instance.Core.unsetCanvasMultiplier();
      sp1.unsubscribe();
      sp2.unsubscribe();
    };
  }, [inited]);

  return (
    <div>
      <div style={{ width: '1000px', height: '100%' }} ref={ref}></div>
    </div>
  );
};
