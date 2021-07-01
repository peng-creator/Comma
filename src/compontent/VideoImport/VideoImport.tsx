import React, { useEffect } from 'react';
import { message, Modal, Popconfirm } from 'antd';
import { ipcRenderer } from 'electron';
import path from 'path';
import { finalize, reduce, scan, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { CloseCircleOutlined } from '@ant-design/icons';
import { processVideos$ } from '../../video_process/index.mjs';
import { dbRoot } from '../../database/db';
import { useBehavior } from '../../state';
import { selectedWordbook$ } from '../../state/user_input/selectedWordbook';
import { Wordbook } from '../../database/wordbook';
import { partialUpdate } from '../../state/reactive/wordClips';
import { WordClips } from '../../types/WordClips';
import styles from './VideoImport.css';

let totalFileCount$ = new BehaviorSubject(0);
let finishedFileCount$ = new BehaviorSubject(0);
let fileClipPersistentSubscription: Subscription | null = null;
let videoFileSubscription: Subscription | null = null;

let closeDirectly = false;

window.addEventListener('beforeunload', (e) => {
  if (closeDirectly || fileClipPersistentSubscription === null) {
    return;
  }
  e.returnValue = false;
  if (fileClipPersistentSubscription !== null) {
    Modal.confirm({
      title: '剪辑导入任务正在执行',
      content: '下次重新导入相同文件即可恢复进度，是否退出？',
      okText: '确认',
      cancelText: '取消',
      onOk() {
        console.log('确认退出');
        closeDirectly = true;
        window.close();
      },
    });
  }
});

let selectedWordbook: Wordbook | null = null;
selectedWordbook$.subscribe({
  next: (wb) => {
    selectedWordbook = wb;
  },
});

export const importTask = () => {
  if (videoFileSubscription !== null) {
    Modal.confirm({
      title: '任务进行中，是否替换？',
      content: '已经有一个导入任务正在进行中，是否将其停止并开始新的任务？',
      okText: '确认',
      cancelText: '取消',
      onOk() {
        fileClipPersistentSubscription?.unsubscribe();
        videoFileSubscription?.unsubscribe();
        videoFileSubscription = null;
        fileClipPersistentSubscription = null;
        importTask();
      },
    });
    return;
  }
  ipcRenderer.send('selectVideoFile');
  ipcRenderer.once('videoFileSelected', async (e, files) => {
    if (files.length < 1) {
      return;
    }
    console.log('selected files:', files);
    const { videoFile$, fileClipPersistent$ } = processVideos$(
      path.join(dbRoot, 'video_output'),
      files
    );
    fileClipPersistentSubscription = (
      fileClipPersistent$ as Observable<unknown>
    )
      .pipe(
        tap((wordClips) => {
          console.log('one video import finished, wordClips:', wordClips);
          console.log(
            'one video import finished, selectedWordbook:',
            selectedWordbook
          );
          if (selectedWordbook !== null) {
            partialUpdate(selectedWordbook.words, wordClips as WordClips);
          }
        }),
        scan((acc) => acc + 1, 0),
        finalize(() => {
          fileClipPersistentSubscription = null;
          videoFileSubscription = null;
          finishedFileCount$.next(0);
          totalFileCount$.next(0);
        })
      )
      .subscribe({
        next: (count: number) => {
          finishedFileCount$.next(count);
        },
        complete: () => {
          message.info('视频导入任务已完成');
        },
        error: (e: any) => {
          message.error(e?.message || '视频转码时出错。');
        },
      });
    videoFileSubscription = (videoFile$ as Observable<unknown>)
      .pipe(reduce((acc) => acc + 1, 0))
      .subscribe({
        next: (count: number) => {
          totalFileCount$.next(count);
        },
        error: (e: any) => {
          fileClipPersistentSubscription = null;
          videoFileSubscription = null;
          finishedFileCount$.next(0);
          totalFileCount$.next(0);
          message.error(e?.message || '导入视频时出错。');
        },
      });
  });
};
type VideoImportComponentProps = {
  setShowLeftPanel: (show: boolean) => void;
  showLeftPanel: boolean;
};

export const VideoImportComponent = ({
  setShowLeftPanel,
  showLeftPanel,
}: VideoImportComponentProps) => {
  let [totalFileCount] = useBehavior(totalFileCount$, 0);
  let [finishedFileCount] = useBehavior(finishedFileCount$, 0);
  useEffect(() => {
    console.log(
      'totalFileCount in VideoImportComponent effect:',
      totalFileCount
    );
    if (totalFileCount !== 0 && showLeftPanel === false) {
      console.log('setShowLeftPanel(true) in VideoImportComponent effect');
      setShowLeftPanel(true);
    }
  }, [totalFileCount]);
  if (totalFileCount === 0) {
    return null;
  }
  return (
    <div className={styles.Container}>
      <div>
        视频导入：已完成 {totalFileCount} 个中的 {finishedFileCount} 个
      </div>
      <div>视频转码需要较长时间，请耐心等待</div>
      <Popconfirm
        placement="bottom"
        title="确认中断当前任务？"
        onConfirm={() => {
          fileClipPersistentSubscription?.unsubscribe();
          videoFileSubscription?.unsubscribe();
          fileClipPersistentSubscription = null;
          videoFileSubscription = null;
          finishedFileCount$.next(0);
          totalFileCount$.next(0);
        }}
        okText="确认"
        cancelText="取消"
      >
        <div className={styles.CloseBtn}>
          <CloseCircleOutlined />
        </div>
      </Popconfirm>
    </div>
  );
};
