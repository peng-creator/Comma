import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Slider from '@material-ui/core/Slider';

export const ClipSlider = withStyles({
  root: {
    color: 'rgb(169, 118, 236)',
    height: 4,
  },
  thumb: {
    height: 14,
    width: 1,
    backgroundColor: '#fff',
    border: '1px solid #fff',
    marginTop: -6,
    transform: 'translate(3px, 0)',
    '&:focus, &:hover, &$active': {
      boxShadow: 'inherit',
    },
    borderRadius: 0,
  },
  active: {},
  valueLabel: {
    left: 'calc(-50% + 4px)',
  },
  track: {
    height: 2,
    borderRadius: 0,
  },
  rail: {
    height: 2,
    borderRadius: 0,
  },
})(Slider);
