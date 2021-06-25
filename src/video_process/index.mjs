import { promises as fs } from 'fs';
import path from 'path';
import md5 from 'md5';
import { Observable, from, EMPTY, of, timer } from 'rxjs';
import {
  mergeMap,
  map,
  scan,
  tap,
  debounce,
  reduce,
  finalize,
  catchError,
  filter,
  share,
  mergeWith,
  combineLatestWith,
} from 'rxjs/operators';
import { message } from 'antd';
import { cutVideo, getWordsWithTimeSection } from './ffmpeg.mjs';
import { mkdir, millisecondsToTime } from '../util/index.mjs';
import {
  getWordVideos,
  addWordVideos,
  addVideoWords,
} from '../database/db.mjs';

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
 * @param timePadding 剪辑前后各多填充一部分的时长
 * @param outDir 视频输出目录
 * @param sourcePathList 输入路径数组，可以是目录和视频文件
 * @returns 返回一个包含了各个文件的剪辑数量和处理进度的 Observable
 */
export function processVideos$(
  outDir,
  sourcePathList,
  timePadding = 6000,
  concurrent = 2,
  coverIfExists = false
) {
  const videoFile$ = new Observable((observer) => {
    (async () => {
      const files = [...sourcePathList];
      for (const file of files) {
        const stat = await fs.stat(file);
        if (stat.isDirectory()) {
          const innerFiles = await fs.readdir(file);
          for (const innerFile of innerFiles) {
            files.push(path.join(file, innerFile));
          }
          continue;
        }
        const basename = path.basename(file);
        const extname = path.extname(file);
        const isHidingFile = basename.startsWith('.');
        const notMkvNorMp4 =
          !extname.endsWith('mkv') && !extname.endsWith('mp4');
        if (isHidingFile || notMkvNorMp4) {
          continue;
        }
        console.log('next video file:', file);
        observer.next(file);
      }
      observer.complete();
    })().catch((e) => {
      console.log(`get video files error: ${e.message}`);
      observer.error(e);
    });
  });
  // 计算每个文件的剪辑计划
  const fileWithCutInfoList$ = from(mkdir(outDir)).pipe(
    mergeMap(() => {
      return videoFile$.pipe(
        // 一个文件对应一个数组，对应流中一个数据项目，数组中为剪辑信息
        mergeMap((file) => {
          return from(
            getWordsWithTimeSection(file)
              .then((wordsWithTimeSectionList) => {
                // 计算剪辑计划
                return Promise.all(
                  wordsWithTimeSectionList.map(
                    async ({ start, end, words }, i) => {
                      if (words.length < 1) {
                        return;
                      }
                      const md5Str = md5(file + i);
                      const outputPath = path.join(outDir, `${md5Str}.mp4`);
                      let newWords = 0;
                      for (const word of words) {
                        const videos = await getWordVideos(word);
                        if (
                          videos !== undefined &&
                          videos !== null &&
                          videos.length > 200
                        ) {
                          // 当一个单词的视频剪辑数量超过200个时，就不再单独为它剪辑视频了。
                          continue;
                        }
                        newWords += 1;
                      }
                      if (newWords === 0) {
                        // 没有新的单词则不剪辑这句
                        return;
                      }
                      let paddingWords = words;
                      // 计算片段的剪切时间、片段包含的单词
                      let cutStart = start;
                      for (let j = i - 1; j > 0; j -= 1) {
                        const {
                          start: startPrev,
                          end: endPrev,
                          words: wordsPrev,
                        } = wordsWithTimeSectionList[j];
                        if (Math.abs(endPrev - start) > timePadding) {
                          break;
                        }
                        cutStart = startPrev;
                        paddingWords = paddingWords.concat(wordsPrev);
                      }
                      let cutEnd = end;
                      for (
                        let j = i + 1;
                        j < wordsWithTimeSectionList.length;
                        j += 1
                      ) {
                        const {
                          start: startNext,
                          end: endNext,
                          words: wordsNext,
                        } = wordsWithTimeSectionList[j];
                        if (Math.abs(startNext - end) > timePadding) {
                          break;
                        }
                        cutEnd = endNext;
                        paddingWords = paddingWords.concat(wordsNext);
                      }
                      if (Math.abs(cutEnd - cutStart) < timePadding) {
                        cutStart -= timePadding / 2;
                        cutEnd += timePadding / 2;
                      }
                      const cutLength = millisecondsToTime(
                        Math.abs(cutStart - cutEnd)
                      );
                      return {
                        file,
                        cutStart,
                        cutLength,
                        paddingWords: [...new Set(paddingWords)],
                        words,
                        outputPath,
                      };
                    }
                  )
                );
              })
              .then((cutInfoList) => {
                // 处理剪辑计划数组，过滤 undefined，即无需剪辑的片段。
                return {
                  file,
                  cutInfoList: cutInfoList.filter((info) => info !== undefined),
                };
              })
              .catch((e) => {
                console.log('getWordsWithTimeSection error:', e);
                message.warn(e.message);
                return { file, cutInfoList: [] };
              })
          );
        }),
        catchError((e) => {
          console.log('mergeMap getWordsWithTimeSection error:', e);
        })
        // shareReplay()
      );
    }),
    catchError((e) => {
      console.log('mergeMap videoFile$ error:', e);
    }),
    mergeMap(({ file, cutInfoList }) => {
      console.log('file and cutInfoList, file:', file);
      return from(
        Promise.all(
          cutInfoList.map((cutInfo) => {
            const { outputPath } = cutInfo;
            return (async () => {
              let existsBeforeTask = false;
              if (coverIfExists === false) {
                try {
                  await Promise.all([
                    fs.stat(outputPath),
                    fs.stat(`${outputPath}.ass`),
                  ]); // 如果已经存在该视频，则不再发起剪辑任务
                  existsBeforeTask = true;
                } catch (e) {
                  console.warn('get if clip existsBeforeTask error', e);
                }
              }
              cutInfo.existsBeforeTask = existsBeforeTask;
              return cutInfo;
            })();
          })
        ).then((cutInfoList) => ({ file, cutInfoList }))
      );
    }),
    share(),
    catchError((err) => {
      console.log('load cut project failed:', err);
    })
  );
  const cutInfo$ = fileWithCutInfoList$.pipe(
    mergeMap(({ cutInfoList }) => {
      return from(cutInfoList);
    }),
    share()
  );
  const cutExists$ = cutInfo$.pipe(
    filter((cutInfo) => {
      return cutInfo.existsBeforeTask === true;
    })
    // mergeMap((cutInfo) => {
    //   return timer(1).pipe(mapTo(cutInfo));
    // }, 1),
    // shareReplay()
  );
  const cutNotExists$ = cutInfo$.pipe(
    filter((cutInfo) => {
      return cutInfo.existsBeforeTask === false;
    })
  );
  const cut$ = cutNotExists$.pipe(
    mergeMap((cutInfo) => {
      console.log('start to mergeMap cutInfo');
      let newWords = 0;
      for (const word of cutInfo.words) {
        const videos = getWordVideos(word);
        if (videos !== undefined && videos.length > 200) {
          // 当一个单词的视频剪辑数量超过200个时，就不再单独为它剪辑视频了。
          continue;
        }
        newWords += 1;
      }
      if (newWords === 0) {
        // 没有新的单词则不剪辑这句
        console.log('no new words found');
        return EMPTY;
      }
      console.log('new words count: ', newWords);
      const { file, cutStart, cutLength, outputPath } = cutInfo;
      return from(
        cutVideo(
          file,
          millisecondsToTime(cutStart),
          cutLength,
          outputPath
        ).then(() => cutInfo)
      );
    }, concurrent), // 控制并发
    finalize(() => {
      console.log('cut$ ended...');
    })
  );
  const totalClips$ = fileWithCutInfoList$.pipe(
    reduce((acc, { file, cutInfoList }) => {
      console.log(`reduce to compute init progress, file: ${file}`);
      return acc + cutInfoList.length;
    }, 0)
  );
  let firstPercent = 0;
  let firstPercentDate = null;
  return cutExists$.pipe(
    mergeWith(cut$),
    tap(({ paddingWords, words, outputPath }) => {
      addVideoWords(outputPath, paddingWords);
      for (const word of words) {
        addWordVideos(word, [outputPath]);
      }
    }),
    scan((acc, curr) => acc + 1, 0),
    combineLatestWith(totalClips$),
    map(([finished, total]) => {
      const percentNow = (finished / total) * 100;
      console.log(`总进度:${percentNow}%`);
      if (firstPercent === 0) {
        firstPercentDate = new Date().valueOf();
        firstPercent = percentNow;
        return {
          percent: percentNow,
        };
      }
      const now = new Date().valueOf();
      const timePassed = now - firstPercentDate;
      const percentPassed = percentNow - firstPercent;
      const percentRemian = 100 - percentNow;
      const timeWillTaken = (percentRemian / percentPassed) * timePassed;

      const millsecondsRemaining = timeWillTaken % 1000;
      const seconds = (timeWillTaken - millsecondsRemaining) / 1000;
      const secondsRemaining = seconds % 60;
      const minute = (seconds - secondsRemaining) / 60;
      const minuteRemaining = minute % 60;
      const hour = (minute - minuteRemaining) / 60;
      let timeRemain = '';
      if (hour > 0) {
        timeRemain += `${hour}`.padStart(2, '0').concat('时');
      }
      if (minuteRemaining > 0) {
        timeRemain += `${minuteRemaining}`.padStart(2, '0').concat('分');
      }
      timeRemain += `${secondsRemaining}`.padStart(2, '0').concat('秒');
      console.log('预计剩余时间：');
      return {
        percent: percentNow.toFixed(2),
        timeRemain,
      };
    }),
    debounceWindow(3000),
    share()
  );
}
