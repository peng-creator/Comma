import { Empty } from 'antd';
import React from 'react';

export const WordExplainComponent = ({ wordPlaying }) => {
  if (wordPlaying === null || wordPlaying === undefined) {
    return (
      <div
        style={{
          height: '100%',
          background: 'white',
          color: '#000',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Empty description="播放单词时，这里将展示它的释义" />
      </div>
    );
  }
  return (
    <div style={{ overflow: 'hidden', height: '100%' }}>
      <iframe
        title="youdao"
        style={{ width: '100%', height: '100%' }}
        src={`http://mobile.youdao.com/dict?le=eng&q=${wordPlaying}`}
      />
    </div>
  );
};
