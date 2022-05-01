import React, { CSSProperties } from 'react';

export const Dict = ({
  searchWord,
  style,
  address,
}: {
  searchWord: string;
  address: string;
  // eslint-disable-next-line react/require-default-props
  style?: CSSProperties;
}) => {
  if (!searchWord) {
    return <div>请在上方搜索框内输入您要查询的内容</div>;
  }
  const src = address.replace('{}', encodeURIComponent(searchWord));
  return (
    <iframe
      title="dict"
      style={{
        width: '100%',
        border: 'none',
        background: '#fff',
        height: '100%',
        ...(style || {}),
      }}
      src={src}
    />
  );
};
