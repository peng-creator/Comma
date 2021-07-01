import path from 'path';
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
    const timePassed = now - lastEmitDatce;
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
      const assOutPath = `${videoOutputPath}.ass`;
      cpFile(assSourcePath, assOutPath);
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
                // 计算剪辑计划
                return Promise.all(
                  wordsWithTimeSectionList.map(
                    async ({ start, end, words }) => {
                      return {
                        file,
                        cutStart: start,
                        cutEnd: end,
                        words,
                      };
                    }
                  )
                );
              })
              .then((cutInfoList) => {
                // 处理剪辑计划数组，过滤 undefined，即无需剪辑的片段。
                return cutInfoList.filter((info) => info !== undefined);
              })
              .catch((e) => {
                console.log('getWordsWithTimeSection error:', e);
                message.warn(e.message);
                return [];
              })
          ).pipe(
            mergeMap((cutInfoList) => {
              return from(cutInfoList);
            }),
            mergeMap(({ file, cutStart, cutEnd, words }) => {
              return from(
                words.map((word) => {
                  return {
                    file: path
                      .basename(file)
                      .replace(path.extname(file), '.mp4'),
                    cutStart,
                    cutEnd,
                    word,
                  };
                })
              );
            }),
            reduce((acc, { word, file, cutStart, cutEnd }) => {
              const clip = {
                file,
                cutStart,
                cutEnd,
              };
              if (acc[word] === undefined) {
                acc[word] = [];
              }
              acc[word].push(clip);
              return acc;
            }, {}),
            tap((wordToClips) => {
              console.log('wordToClips:', wordToClips);
              const words = Object.keys(wordToClips);
              const semaphore = new Semaphore(10);
              for (const word of words) {
                semaphore
                  .acquire()
                  .then(() => addWordVideos(word, wordToClips[word]))
                  .finally(() => semaphore.release())
                  .catch((e) => console.error('add word videos failed', e));
              }
            })
          );
        }, 1),
        catchError((e) => {
          console.log('mergeMap getWordsWithTimeSection error:', e);
        })
      );
    })
  );
  return {
    videoFile$,
    fileClipPersistent$,
  };
}
