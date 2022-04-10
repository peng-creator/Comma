import {
  FolderOpenOutlined,
  FolderOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, Drawer } from 'antd';
import React, { memo, useEffect, useState } from 'react';
import { shell } from 'electron';
import PATH from 'path';
import { mkdir } from '../../util/mkdir';
import { ResourceLoader } from '../resourceLoader/ResourceLoader';
import { VideoPlayer } from '../../blocks/VideoPlayer/VideoPlayer';
import { playVideo$ } from '../../state/user_input/playVideoAction';
import { Reader } from '../../blocks/Reader/Reader';
import { DictAndCardMaker } from '../../blocks/DictAndCardMaker/DictAndCardMaker';
import { openSentence$ } from '../../state/user_input/openSentenceAction';
import { playSubtitle$ } from '../../state/user_input/playClipAction';
import { CardReview } from '../../blocks/CardReview/CardReview';
import styles from './Learning.css';

import { openCardReviewAction$ } from '../../compontent/FlashCardMaker/FlashCardMaker';
import { dbRoot } from '../../constant';
import { PDF } from '../../blocks/PDF/PDF';
import { openPdf$ } from '../../state/user_input/openPdfAction';

const L1 = PATH.join(dbRoot, 'resource');
mkdir(L1);

const Component = () => {
  const [visible, setVisible] = useState(false);
  const [article, setArticle] = useState('');
  const [videoFile, setVideoFile] = useState('');
  const [showCardReview, setShowCardReview] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    const sp = openPdf$.subscribe({
      next(file) {
        if (file) {
          setShowPdf(true);
        } else {
          setShowPdf(false);
        }
      },
    });
    return () => sp.unsubscribe();
  }, []);

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

  useEffect(() => {
    const sp = openCardReviewAction$.subscribe({
      next() {
        setShowCardReview(true);
      },
    });
    return () => sp.unsubscribe();
  }, []);

  return (
    <div
      style={{
        marginTop: '22px',
        height: 'calc(100% - 22px)',
        backgroundColor: 'rgb(30, 30, 35)',
        position: 'relative',
        padding: '14px',
      }}
    >
      <div className={styles.learningContainer}>
        {showCardReview && (
          <div
            style={{
              width: '30%',
              padding: '80px 14px 14px',
              position: 'relative',
              minWidth: '600px',
            }}
          >
            <Button
              type="text"
              style={{
                fontSize: '40px',
                color: 'white',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 2,
              }}
              // shape="circle"
              onClick={() => {
                setShowCardReview(false);
              }}
            >
              <CloseOutlined />
            </Button>
            <CardReview></CardReview>
          </div>
        )}
        {showPdf && (
          <div
            style={{
              height: '100%',
              margin: '0 14px',
            }}
          >
            <PDF></PDF>
          </div>
        )}
        {article && (
          <div
            style={{
              width: '30%',
              padding: '14px',
              minWidth: '800px',
            }}
          >
            <Reader
              onClose={() => {
                setArticle('');
              }}
            ></Reader>
          </div>
        )}
        {videoFile && (
          <div style={{ minWidth: '900px', padding: '14px' }}>
            <VideoPlayer
              onClose={() => {
                setVideoFile('');
              }}
            ></VideoPlayer>
          </div>
        )}
        <div
          style={{
            width: '20%',
            minWidth: '800px',
            padding: '14px',
          }}
        >
          <DictAndCardMaker isDragging={false}></DictAndCardMaker>
        </div>
      </div>
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
