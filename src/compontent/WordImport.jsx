import React, { useState } from 'react';
import { Button, Input, message, Modal } from 'antd';
import { saveWordbook } from '../database/wordbook.mjs';

export const WordsImportComponent = ({ wordbook, onNewWordsImported }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [content, setContent] = useState('');

  const closeModal = () => {
    setIsModalVisible(false);
    setContent('');
  };
  const handleOk = () => {
    const wordsToAdd = content
      .split(/[^a-zA-Z'-]+/)
      .map((s) => s.toLowerCase())
      .flat()
      .filter((s) => s.length > 1);
    if (wordsToAdd.length === 0) {
      return closeModal();
    }
    wordsToAdd.forEach((w) => {
      wordbook?.add(w);
    });
    console.log('wordbook:', wordbook);
    saveWordbook(wordbook);
    console.log('select words from wordbook');
    onNewWordsImported(wordbook, wordsToAdd);
    closeModal();
  };

  return (
    <>
      <Modal
        title="导入单词"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={closeModal}
      >
        <Input.TextArea
          placeholder="请将包含单词的文本粘贴到这里"
          autoFocus
          onChange={(e) => {
            setContent(e.target.value);
          }}
          value={content}
          rows={10}
          style={{ resize: 'none' }}
        />
      </Modal>
      <Button
        style={{ width: '100%' }}
        onClick={() => {
          if (wordbook === undefined || wordbook === null) {
            message.error('请先选择一个单词本!');
            return;
          }
          if (isModalVisible) {
            return;
          }
          setIsModalVisible(true);
        }}
      >
        导入单词
      </Button>
    </>
  );
};
