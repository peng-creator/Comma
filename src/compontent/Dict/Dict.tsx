import React, { CSSProperties } from 'react';

export const Dict = ({
  searchWord,
  style,
}: {
  searchWord: string;
  // eslint-disable-next-line react/require-default-props
  style?: CSSProperties;
}) => {
  return (
    // eslint-disable-next-line react/no-danger
    <iframe
      title="youdao"
      style={{
        width: '100%',
        border: 'none',
        background: '#fff',
        height: '100%',
        ...(style || {}),
      }}
      src={`http://mobile.youdao.com/dict?le=eng&q=${searchWord}`}
    />
  );
};
