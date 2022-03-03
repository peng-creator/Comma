import path from 'path';
import { promises as fs } from 'fs';
import { from, of, timer } from 'rxjs';
import cpFile from 'cp-file';
import {
  mergeMap,
  map,
  tap,
  debounce,
  reduce,
  catchError,
  shareReplay,
} from 'rxjs/operators';
import { message } from 'antd';
import { getWordsWithTimeSection, convertToMp4 } from './ffmpeg.mjs';
import { getConvertOutputPath, Semaphore } from '../util/index.mjs';
import { addWordVideos } from '../database/db.ts';
import { getVideoFiles$ } from './getVideoFiles.mjs';
import { mkdir } from '../util/mkdir.ts';

// 发射 dueTime 时间段内从source中收到的最后一个值。
export const debounceWindow = (dueTime) => {
  let lastEmitDate = Date.now();
  return debounce(() => {
    const now = Date.now();
    const timePassed = now - lastEmitDate;
    if (timePassed >= dueTime) {
      lastEmitDate = now;
      return of(true);
    }
    return timer(dueTime - timePassed).pipe(
      tap(() => {
        lastEmitDate = Date.now();
      }),
      map(() => true)
    );
  });
};

/**
 * @param concurrent 剪辑任务并发数，一个原视频对应多个剪辑任务。
 * @param outDir 视频输出目录
 * @param sourcePathList 输入路径数组，可以是目录和视频文件
 * @returns 返回一个包含了各个文件的剪辑数量和处理进度的 Observable
 */
export function processVideos$(outDir, sourcePathList, concurrent = 2) {
  const videoFile$ = getVideoFiles$(sourcePathList).pipe(shareReplay(1));
  const convert$ = videoFile$.pipe(
    mergeMap((file) => {
      const videoOutputPath = getConvertOutputPath(file, 'mp4', outDir);
      const assSourcePath = getConvertOutputPath(file, 'ass');
      const assOutPath = `${videoOutputPath.slice(0, -4)}.ass`;
      cpFile(assSourcePath, assOutPath).catch(() => {
        message.warn('字幕文件缺失：', assSourcePath);
      });
      return from(convertToMp4(file, videoOutputPath)); // source stream
    }, concurrent)
  );
  // 计算每个文件的剪辑计划
  const fileClipPersistent$ = from(mkdir(outDir)).pipe(
    mergeMap(() => {
      return convert$.pipe(
        // 一个文件对应一个数组，对应流中一个数据项目，数组中为剪辑信息
        mergeMap((file) => {
          return from(
            getWordsWithTimeSection(file)
              .then((wordsWithTimeSectionList) => {
                console.log(
                  'output path: ',
                  getConvertOutputPath(file, 'json', outDir)
                );
                return fs.writeFile(
                  getConvertOutputPath(file, 'json', outDir),
                  JSON.stringify(wordsWithTimeSectionList, null, 2)
                );
              })
              .catch((e) => {
                console.log('save subtitle json failed: ', e);
              })
          );
        }, 1)
      );
    })
  );
  return {
    videoFile$,
    fileClipPersistent$,
  };
}
