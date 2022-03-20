import {
  BookOutlined,
  FolderOpenOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { Button, Drawer } from 'antd';
import React, { memo, useEffect, useState } from 'react';
import { shell } from 'electron';
import PATH from 'path';
import { Article } from '../article/Article';
import { dbRoot } from '../../database/db';
import { mkdir } from '../../util/mkdir';
import { ResourceLoader } from '../resourceLoader/ResourceLoader';
import { VideoPlayer } from '../../blocks/VideoPlayer/VideoPlayer';
import { playVideo$ } from '../../state/user_input/playVideoAction';
import { Reader } from '../../blocks/Reader/Reader';
import { DictAndCardMaker } from '../../blocks/DictAndCardMaker/DictAndCardMaker';
import { openSentence$ } from '../../state/user_input/openSentenceAction';
import { playSubtitle$ } from '../../state/user_input/playClipAction';

const L1 = PATH.join(dbRoot, 'resource', 'reading');
mkdir(L1);

const Component = () => {
  const [visible, setVisible] = useState(false);
  const [article, setArticle] = useState('');
  const [videoFile, setVideoFile] = useState('');
  useEffect(() => {
    const sp = openSentence$.subscribe({
      next(sentence) {
        if (sentence !== null) {
          setArticle(sentence.file);
        }
      },
    });
    return () => sp.unsubscribe();
  }, []);

  useEffect(() => {
    const sp = playSubtitle$.subscribe({
      next(subtitle) {
        if (subtitle !== null) {
          setVideoFile(subtitle.file);
        }
      },
    });
    return () => sp.unsubscribe();
  }, []);

  return (
    <div
      style={{
        marginTop: '22px',
        display: 'flex',
        height: 'calc(100% - 22px)',
        backgroundColor: 'rgb(30, 30, 35)',
        position: 'relative',
        justifyContent: 'center',
        padding: '14px',
      }}
    >
      {article && (
        <div
          style={{
            width: '30%',
            flexGrow: 1,
            padding: '14px',
            minWidth: '300px',
            maxWidth: '800px',
          }}
        >
          <Reader
            onClose={() => {
              setArticle('');
            }}
          ></Reader>
        </div>
      )}
      <div
        style={{
          width: '20%',
          maxWidth: '800px',
          flexGrow: 1,
          padding: '14px',
        }}
      >
        <DictAndCardMaker isDragging={false}></DictAndCardMaker>
      </div>
      {videoFile && (
        <div style={{ width: '30%', flexGrow: 1, padding: '14px' }}>
          <VideoPlayer
            onClose={() => {
              setVideoFile('');
            }}
          ></VideoPlayer>
        </div>
      )}
      <Drawer
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>资源</div>
            <Button
              type="text"
              onClick={() => {
                shell.showItemInFolder(L1);
              }}
            >
              <FolderOpenOutlined />
            </Button>
          </div>
        }
        placement="right"
        onClose={() => {
          setVisible(false);
        }}
        getContainer={false}
        visible={visible}
        style={{ position: 'absolute' }}
      >
        <ResourceLoader
          onOpenArticle={(file) => {
            console.log('resource loader onOpenArticle, load file:', file);
            setVisible(false);
            setArticle(file);
          }}
          onOpenVideo={(file) => {
            console.log('resource loader onOpenVideo, load file:', file);
            playVideo$.next(file);
            setVideoFile(file);
            setVisible(false);
          }}
        ></ResourceLoader>
      </Drawer>
      <Button
        style={{ position: 'absolute', right: '14px', top: '14px' }}
        onClick={() => {
          setVisible(true);
        }}
      >
        <FolderOutlined />
      </Button>
    </div>
  );
};
export const Learning = memo(Component);
