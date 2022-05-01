import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Input, List, Modal, Row, Switch } from 'antd';
import { EditOutlined } from '@ant-design/icons';

export const LazyInput = ({
  value,
  onChange,
  displayValueTo,
  modalTitle,
  onWordClick,
}: {
  value: any;
  displayValueTo?: (value: any) => any;
  onChange: (value: any) => void;
  onWordClick?: (word: string) => void;
  modalTitle?: string;
}) => {
  const inputRef = useRef<Input | null>();
  const [editing, setEditing] = useState(false);
  const content = displayValueTo && displayValueTo(value);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div>
        {content.split(' ').map((word: string, index: number) => {
          return (
            <span
              key={index}
              tabIndex={0}
              onKeyDown={() => {}}
              onClick={() => {
                if (onWordClick) {
                  onWordClick(word);
                }
              }}
              style={{ margin: '0 3px', cursor: 'pointer' }}
            >
              {word}
            </span>
          );
        })}
        <Button
          type="text"
          onClick={() => {
            setEditing(true);
          }}
          style={{ color: 'white' }}
        >
          <EditOutlined />
        </Button>
      </div>
      {editing ? (
        <Modal
          title={modalTitle}
          visible={editing}
          onOk={() => {
            console.log(
              'lazy input changed to value:',
              inputRef.current.input.value
            );
            onChange(inputRef.current.input.value);
            setEditing(false);
          }}
          onCancel={() => {
            setEditing(false);
            inputRef.current.input.value = value;
          }}
        >
          <Input ref={inputRef} autoFocus defaultValue={value}></Input>
        </Modal>
      ) : null}
    </div>
  );
};
LazyInput.defaultProps = {
  displayValueTo: (value: any) => value,
  modalTitle: '修改',
};
