import React, { useState, useEffect } from 'react';
import { FolderFilled, VideoCameraFilled } from '@ant-design/icons';

export interface Episode {
  path: string;
  name: string;
  children?: Episode[];
  showAdd?: boolean;
  isDir?: boolean;
}

export const EpisodeItem = ({
  episode,
  onOpen,
}: {
  episode: Episode;
  onOpen: () => void;
}) => {
  const { isDir, path } = episode;
  if (!isDir && !path.endsWith('.mp4')) {
    return null;
  }
  return (
    <div
      tabIndex={0}
      style={{
        width: '100px',
        textAlign: 'center',
        cursor: 'pointer',
        margin: '10px 30px',
      }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onOpen();
        }
      }}
    >
      {isDir ? (
        <FolderFilled
          style={{ fontSize: '100px', color: 'rgb(89, 192, 240)' }}
        />
      ) : (
        <VideoCameraFilled
          style={{ fontSize: '100px', color: 'rgb(89, 192, 240)' }}
        />
      )}
      <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>
        {episode.name}
      </div>
      {/* <div>{episode.path}</div> */}
    </div>
  );
};
