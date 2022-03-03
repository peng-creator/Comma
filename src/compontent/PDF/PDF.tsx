import React, { useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import PATH from 'path';
import { Pagination } from 'antd';
import { dbRoot } from '../../database/db';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

export const PDF = () => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  console.log('numPages:', numPages);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div style={{ color: '#000', overflowY: 'auto', position: 'relative' }}>
      <Document
        file={PATH.join(
          dbRoot,
          'reading',
          '1.AGameOfThrones-GeorgeR.R.Martin.pdf'
        )}
        onLoadSuccess={onDocumentLoadSuccess}
        onItemClick={(e) => {
          console.log('onItemClick:', e);
        }}
        onClick={(e) => {
          console.log(e);
        }}
      >
        <Page pageNumber={pageNumber} renderMode="svg" scale={2} />
      </Document>
      <div>
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
  );
};
