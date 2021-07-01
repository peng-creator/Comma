import React, { CSSProperties } from 'react';
import styles from './Wave.css';

export const Wave = ({
  style,
  animated,
}: {
  style?: CSSProperties;
  animated?: boolean;
}) => {
  return (
    <div className={styles.Container} style={style}>
      <div
        className={[styles.Bar, styles.One, animated && styles.Animated].join(
          ' '
        )}
      />
      <div
        className={[styles.Bar, styles.Two, animated && styles.Animated].join(
          ' '
        )}
      />
      <div
        className={[styles.Bar, styles.Three, animated && styles.Animated].join(
          ' '
        )}
      />
      <div
        className={[styles.Bar, styles.Four, animated && styles.Animated].join(
          ' '
        )}
      />
      <div
        className={[styles.Bar, styles.Five, animated && styles.Animated].join(
          ' '
        )}
      />
    </div>
  );
};

Wave.defaultProps = {
  style: {},
  animated: false,
};
