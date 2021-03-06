import React, { useRef, useState } from 'react';
import { Input, Modal } from 'antd';
import { useContextMenu } from 'react-contexify';
import { DynamicMenu, setContextMenu } from '../../state/system/contextMenu';

const MENU_ID = 'MENU_ID';

export const LazyInput = ({
  value,
  onChange,
  displayValueTo,
  modalTitle,
  onWordClick,
  menu,
  canEdit,
}: {
  value: any;
  menu?: DynamicMenu;
  displayValueTo?: (value: any) => any;
  onChange?: (value: any) => void;
  onWordClick?: (word: string) => void;
  modalTitle?: string;
  canEdit?: boolean;
}) => {
  const inputRef = useRef<Input | null>();
  const [editing, setEditing] = useState(false);
  const content = displayValueTo && displayValueTo(value);
  if (canEdit === undefined) {
    canEdit = true;
  }
  const { show } = useContextMenu({
    id: MENU_ID,
  });

  return (
    <>
      <div
        onContextMenu={(event) => {
          event.preventDefault();
          if (menu) {
            setContextMenu([
              ...menu,
              canEdit
                ? [
                    {
                      onClick: () => {
                        setEditing(true);
                      },
                      title: '修改',
                    },
                  ]
                : [],
            ]);
          } else if (canEdit) {
            setContextMenu([
              [
                {
                  onClick: () => {
                    setEditing(true);
                  },
                  title: '修改',
                },
              ],
            ]);
          }
          show(event, {
            props: {
              key: 'value',
            },
          });
        }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
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
              style={{ padding: '0 4px', cursor: 'pointer' }}
            >
              {word}
            </span>
          );
        })}
      </div>
      {editing && canEdit ? (
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
    </>
  );
};
LazyInput.defaultProps = {
  displayValueTo: (value: any) => value,
  modalTitle: '修改',
};
