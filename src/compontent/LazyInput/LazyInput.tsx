import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Input, List, Modal, Row, Switch } from 'antd';

export const LazyInput = ({
  value,
  onChange,
  displayValueTo,
  modalTitle,
}: {
  value: any;
  displayValueTo?: (value: any) => any;
  onChange: (value: any) => void;
  modalTitle?: string;
}) => {
  const inputRef = useRef<Input | null>();
  const [editing, setEditing] = useState(false);
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div
        tabIndex={0}
        onKeyDown={() => {}}
        onClick={() => {
          setEditing(true);
        }}
      >
        {displayValueTo && displayValueTo(value)}
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
