import React from 'react';
import { Select } from 'antd';

const { Option } = Select;

export const WordbookSelector = ({
  wordbook,
  wordbooks,
  onWordbookSelected,
}) => {
  console.log('render WordbookSelector, wordbooks:', wordbooks);
  return (
    <Select
      showSearch
      style={{ width: '100%' }}
      placeholder="选择一个单词本"
      value={wordbook?.name}
      onChange={(value) => {
        console.log(`selected:`, value);
        const wb = wordbooks.find((wordbook) => wordbook.name === value);
        if (wb !== undefined) {
          onWordbookSelected(wb);
        }
      }}
    >
      {wordbooks.map((item) => (
        <Option key={item.name} value={item.name}>
          {item.name}
        </Option>
      ))}
    </Select>
  );
};
