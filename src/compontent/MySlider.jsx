import React from 'react';
import Slider from '@material-ui/core/Slider';

let timer = null;
export const MySlider = (props) => {
  let passProps = { ...props };
  delete passProps.debounceTime;
  return (
    <Slider
      valueLabelDisplay="auto"
      {...passProps}
      onChange={(e, v) => {
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
