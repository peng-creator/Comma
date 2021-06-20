import React from 'react';
import { Button, message } from 'antd';
import { ipcRenderer } from 'electron';
import { promises as fs } from 'fs';
import { saveWordbook } from '../database/wordbook.mjs';

export const WordsImportComponent = ({ wordbook, selectWordsFromWordbook }) => {
  return (
    <Button
      style={{ width: '100%' }}
      onClick={() => {
        if (wordbook === undefined || wordbook === null) {
          message.error('请先选择一个单词本!');
          return;
        }
        ipcRenderer.send('selectTextFile');
        ipcRenderer.once('textFileSelected', async (e, files) => {
          console.log('selected file:', files);
          for (const file of files) {
            const fileContent = await fs.readFile(file, 'utf8');
            fileContent
              .split(/[^a-zA-Z'-]+/)
              .map((s) => s.toLowerCase())
              .flat()
              .filter((s) => s.length > 1)
              .forEach((w) => {
                wordbook?.add(w);
              });
          }
          console.log('wordbook:', wordbook);
          saveWordbook(wordbook);
          console.log('select words from wordbook');
          selectWordsFromWordbook(wordbook);
        });
      }}
    >
      导入单词
    </Button>
  );
};
