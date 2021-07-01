import React, { useEffect, useState } from 'react';
import { Modal, Input } from 'antd';
import { Wordbook, saveWordbook } from '../../database/wordbook';
import { newWordbookAction$ } from '../../state/user_input/newWordbookAction';
import { useBehavior } from '../../state';
import { wordbooks$ } from '../../state/system/wordbooks';
import { selectedWordbook$ } from '../../state/user_input/selectedWordbook';

export const AddWordbookComponent = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newWordbookName, setNewWordbookName] = useState('');

  const [wordbooks, setWordbooks] = useBehavior(wordbooks$, []);

  const showModal = () => {
    setNewWordbookName('');
    setIsModalVisible(true);
  };

  useEffect(() => {
    let subscription = newWordbookAction$.subscribe({
      next: () => showModal(),
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleOk = () => {
    setIsModalVisible(false);
    if (newWordbookName.length === 0) {
      return;
    }
    const wb = wordbooks.find((wordbook) => wordbook.name === newWordbookName);
    if (wb !== undefined) {
      return;
    }
    const newWordbook = new Wordbook({ name: newWordbookName, words: [] });
    wordbooks.push(newWordbook);
    setWordbooks([...wordbooks]);
    saveWordbook(newWordbook);
    selectedWordbook$.next(newWordbook);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Modal
        title="新增单词本"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Input
          placeholder="输入单词本名称"
          autoFocus
          onChange={(e) => {
            setNewWordbookName(e.target.value);
          }}
          value={newWordbookName}
        />
      </Modal>
      {/* <Button style={{ width: '100%' }} onClick={showModal}>
        {children || '新增单词本'}
      </Button> */}
    </>
  );
};
