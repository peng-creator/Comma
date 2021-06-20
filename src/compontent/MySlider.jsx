import React from 'react';
import { Slider } from 'antd';

export const MySlider = (props) => {
  let timer = null;
  return (
    <Slider
      {...props}
      onChange={(v) => {
        if (timer !== null) {
          clearTimeout(timer);
        }
        if (props.debounce === false) {
          props.onChange(v);
          return;
        }
        timer = setTimeout(() => {
          props.onChange(v);
        }, props.debounceTime || 2000);
      }}
    />
  );
};
