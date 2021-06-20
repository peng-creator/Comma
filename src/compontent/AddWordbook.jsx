import React, { useState } from 'react';
import { Modal, Button, Input } from 'antd';
import { Wordbook, saveWordbook } from '../database/wordbook.mjs';

export const AddWordbookComponent = ({
  wordbooks,
  setNewWordbookName,
  setWordbooks,
  newWordbookName,
  setWordbook,
  children = null,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = () => {
    setNewWordbookName('');
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
    if (newWordbookName.length === 0) {
      return;
    }
    const wb = wordbooks.find((wordbook) => wordbook.name === newWordbookName);
    if (wb !== undefined) {
      return;
    }
    const newWordbook = new Wordbook({ name: newWordbookName });
    wordbooks.push(newWordbook);
    setWordbooks([...wordbooks]);
    setWordbook(newWordbook);
    saveWordbook(newWordbook);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Modal
        title={children}
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
      <Button style={{ width: '100%' }} onClick={showModal}>
        {children || '新增单词本'}
      </Button>
    </>
  );
};
