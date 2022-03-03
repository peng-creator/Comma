import React, { useState, useEffect } from 'react';
import { promises as fs } from 'fs';
import PATH from 'path';
import { Empty } from 'antd';
import { Episode, EpisodeItem } from './EpisodeItem';

const loadEpisodesOfPath = async (path: string) => {
  return fs
    .readdir(path)
    .then((files) => {
      return Promise.all(
        files.map(async (file) => {
          const filePath = PATH.join(path, file);
          const stat = await fs.stat(filePath);
          console.log('file: ', file, ' stat: ', stat);
          return {
            name: PATH.basename(filePath),
            path: filePath,
            isDir: stat.isDirectory(),
          } as Episode;
        })
      );
    })
    .catch(() => {});
};

export const EpisodeList = ({
  episode,
  onEpisodeOpen,
}: {
  episode: Episode;
  onEpisodeOpen: (episode: Episode) => void;
}) => {
  const { path } = episode;
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  useEffect(() => {
    loadEpisodesOfPath(path)
      .then((episodes) => {
        setEpisodes(episodes || []);
      })
      .catch((e) => setEpisodes([]));
  }, [path]);
  if (episodes.length === 0) {
    return (
      <Empty style={{ color: 'rgb(33, 37, 39)' }} description="没有内容" />
    );
  }
  return (
    <div
      style={{
        color: 'rgb(33, 37, 39)',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      {episodes.map((episode) => (
        <EpisodeItem
          episode={episode}
          key={episode.path}
          onOpen={() => onEpisodeOpen(episode)}
        />
      ))}
    </div>
  );
};
