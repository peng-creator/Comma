import React, { CSSProperties, useEffect } from 'react';
import { UnorderedListOutlined } from '@ant-design/icons';
import styles from './ThumbnailListOpener.css';

export const ThumbnailListOpener = ({
  showThumbnails,
  setShowThumbnils,
}: {
  showThumbnails: boolean;
  setShowThumbnils: (show: boolean) => void;
}) => {
  // useEffect(() => {
  //   const listener = () => {
  //     setShowThumbnils(false);
  //   };
  //   window.addEventListener('click', listener);
  //   return () => {
  //     window.removeEventListener('click', listener);
  //   };
  // }, []);

  return (
    <div
      tabIndex={0}
      className={[
        styles.ThumbnailListOpener,
        showThumbnails && styles.Expanded,
      ].join(' ')}
      onClick={(e) => {
        e.stopPropagation();
        console.log('setShowThumbnils: ', !showThumbnails);
        setShowThumbnils(!showThumbnails);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setShowThumbnils(!showThumbnails);
        }
      }}
    >
      <UnorderedListOutlined style={{ fontSize: '25px' }} />
    </div>
  );
};
