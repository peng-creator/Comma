import React from 'react';
import Slider from '@material-ui/core/Slider';
import { withStyles, makeStyles } from '@material-ui/core/styles';

const PrettoSlider = withStyles({
  root: {
    color: 'rgb(169, 118, 236)',
    height: 8,
  },
  thumb: {
    height: 24,
    width: 24,
    backgroundColor: '#fff',
    border: '2px solid currentColor',
    marginTop: -8,
    transform: 'translate(-5px, 0)',
    '&:focus, &:hover, &$active': {
      boxShadow: 'inherit',
    },
  },
  active: {},
  valueLabel: {
    left: 'calc(-50% + 4px)',
  },
  track: {
    height: 8,
    borderRadius: 4,
  },
  rail: {
    height: 8,
    borderRadius: 4,
  },
})(Slider);

let timer = null;
export const MySlider = (props) => {
  let passProps = { ...props };
  delete passProps.debounceTime;
  delete passProps.debounce;
  return (
    <PrettoSlider
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
