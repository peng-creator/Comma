import React, { CSSProperties, useEffect, useState } from 'react';
import axios from 'axios';

export const Dict = ({
  searchWord,
  style,
}: {
  searchWord: string;
  // eslint-disable-next-line react/require-default-props
  style?: CSSProperties;
}) => {
  // useEffect(() => {
  //   axios
  //     .get(`http://mobile.youdao.com/dict?le=eng&q=${searchWord}`)
  //     .then(({ data }) => {
  //       const document = new DOMParser().parseFromString(data, 'text/html');
  //       console.log('document.body.offsetHeight:', document.body.offsetHeight);
  //     })
  //     .catch((e) => {
  //       console.log(
  //         `http://mobile.youdao.com/dict?le=eng&q=${searchWord}`,
  //         ', query error:',
  //         e
  //       );
  //     });
  // }, [searchWord]);
  return (
    // <webview
    //   id="webpage"
    //   src={`http://mobile.youdao.com/dict?le=eng&q=${searchWord}`}
    //   style={{
    //     backgroundColor: '#fff',
    //     display: 'block',
    //     border: 'none',
    //     height: '80vh',
    //     width: '100%',
    //   }}
    // ></webview>
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
