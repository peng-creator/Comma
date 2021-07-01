import React, { useEffect, useState } from 'react';
import { Input, message, Modal } from 'antd';
import { saveWordbook } from '../../database/wordbook';
import { useBehavior } from '../../state';
import { selectedWordbook$ } from '../../state/user_input/selectedWordbook';
import { wordImportAction$ } from '../../state/user_input/wordImportAction';
import { partialUpdate } from '../../state/reactive/wordClips';

export const WordImportComponent = () => {
  const [wordbook, setWordbook] = useBehavior(selectedWordbook$, null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    const subscription = wordImportAction$.subscribe({
      next: () => {
        if (wordbook === undefined || wordbook === null) {
          message.error('请先选择一个单词本!');
          return;
        }
        if (isModalVisible) {
          return;
        }
        setIsModalVisible(true);
      },
    });
    return () => subscription.unsubscribe();
  }, [wordbook]);

  const closeModal = () => {
    setIsModalVisible(false);
    setContent('');
  };
  const handleOk = () => {
    if (wordbook === null) {
      return;
    }
    const wordsToAdd = content
      .split(/[^a-zA-Z'-]+/)
      .map((s) => s.toLowerCase())
      .flat()
      .filter((s) => s.length > 1);
    if (wordsToAdd.length === 0) {
      return closeModal();
    }
    let newWords: string[] = [];
    wordsToAdd.forEach((w) => {
      let succeed = wordbook.add(w);
      if (succeed) {
        newWords.push(w);
      }
    });
    setWordbook(wordbook?.copy() || null);
    console.log('partialUpdate(newWords):', newWords);
    partialUpdate(newWords);
    console.log('wordbook:', wordbook);
    saveWordbook(wordbook);
    console.log('select words from wordbook');
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
    </>
  );
};
