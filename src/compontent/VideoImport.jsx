import React from 'react';
import { Button, Modal } from 'antd';
import { ipcRenderer } from 'electron';
import path from 'path';
import { finalize } from 'rxjs/operators';
import { processVideos$ } from '../video_process/index.mjs';
import { dbRoot } from '../database/db.mjs';

let subscription = null;

let closeDirectly = false;

window.addEventListener('beforeunload', (e) => {
  if (closeDirectly || subscription === null) {
    return;
  }
  e.returnValue = false;
  if (subscription !== null) {
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

export const VideoImportComponent = ({
  setProgress,
  selectWordsFromWordbook,
  wordbook,
  videoImportSubscription,
  setVideoImportSubscription,
}) => {
  subscription = videoImportSubscription;
  return (
    <Button
      style={{ width: '100%' }}
      onClick={() => {
        const importTask = () => {
          ipcRenderer.send('selectVideoFile');
          ipcRenderer.once('videoFileSelected', async (e, files) => {
            if (files.length < 1) {
              return;
            }
            console.log('selected files:', files);
            setProgress({ isLoading: true });
            setVideoImportSubscription(
              processVideos$(path.join(dbRoot, 'video_output'), files, 6000, 2)
                .pipe(
                  finalize(() => {
                    setVideoImportSubscription(null);
                    setProgress(null);
                    selectWordsFromWordbook(wordbook);
                  })
                )
                .subscribe({
                  next(progress) {
                    setProgress(progress);
                  },
                })
            );
          });
        };
        if (videoImportSubscription !== null) {
          Modal.confirm({
            title: '任务进行中，是否替换？',
            content:
              '已经有一个导入任务正在进行中，是否将其停止并开始新的任务？',
            okText: '确认',
            cancelText: '取消',
            onOk() {
              setProgress(null);
              videoImportSubscription.unsubscribe();
              importTask();
            },
          });
          return;
        }
        importTask();
      }}
    >
      导入视频
    </Button>
  );
};
