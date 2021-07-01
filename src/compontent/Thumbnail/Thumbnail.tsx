import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import md5 from 'md5';
import { DeleteOutlined } from '@ant-design/icons';
import { Popconfirm } from 'antd';
import { Wave } from '../Wave/Wave';
import { getThumbnail } from '../../video_process/ffmpeg.mjs';
import { getVideoFileAbsolutePath } from '../../database/db';
import { Clip } from '../../types/WordClips';
import { thumbnailPath } from '../../constant';
import styles from './Thumbnail.css';
import picSVG from '../../../assets/ic-pic.svg';
import { sleep } from '../../util/sleep';
import { deleteClipIndex$ } from '../../state/user_input/deleteClipAction';

type ThumbnailProps = {
  clip: Clip;
  clipIndex: number;
  style: CSSProperties;
  isPlaying: boolean;
  animated: boolean;
  onClick: () => void;
};
export const Thumbnail = ({
  clip,
  clipIndex,
  style,
  isPlaying,
  animated,
  onClick,
}: ThumbnailProps) => {
  const [thumbnail, setThumbnail] = useState(picSVG);
  const waveContainer = useRef<HTMLDivElement>(null);
  const [showDelBtn, setShowDelBtn] = useState(false);
  useEffect(() => {
    let removed = false;
    const videoFile = getVideoFileAbsolutePath(clip.file);
    sleep(150)
      .then(() => {
        if (removed) {
          console.log('removed!!!!!');
          return picSVG;
        }
        return getThumbnail(
          videoFile,
          `${thumbnailPath}/${md5(JSON.stringify(clip))}.jpg`,
          parseInt(clip.cutStart.toString(), 10)
        );
      })
      .then((src: string) => {
        if (!removed) {
          setThumbnail(src);
        }
      })
      .catch(() => {
        if (!removed) {
          setThumbnail(picSVG);
        }
      });
    return () => {
      removed = true;
    };
  }, [clip]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px',
        overflow: 'hidden',
        ...style,
      }}
      className={styles.ThumbnailWrapper}
      onClick={onClick}
      onMouseMove={() => setShowDelBtn(true)}
      onMouseLeave={() => setShowDelBtn(false)}
    >
      {isPlaying && (
        <div ref={waveContainer} className={styles.WaveContainer}>
          <Wave style={{ width: '100%', height: '100%' }} animated={animated} />
        </div>
      )}
      <img
        style={{ height: '180px', maxWidth: '100%', borderRadius: '5px' }}
        src={thumbnail}
        alt={`thumbnail:${thumbnail}`}
      />
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        className={[styles.DeleteBtn, (showDelBtn && styles.Show) || ''].join(
          ' '
        )}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Popconfirm
          placement="left"
          title="确认删除当前剪辑？"
          onConfirm={() => deleteClipIndex$.next(clipIndex)}
          okText="确认"
          cancelText="取消"
        >
          <DeleteOutlined />
        </Popconfirm>
      </div>
    </div>
  );
};
