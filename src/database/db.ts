import { join } from 'path';
import md5 from 'md5';
import { promises as fs } from 'fs';
import { app } from '@electron/remote';
import { Clip } from '../types/WordClips';
import { Low, JSONFile } from './lowdb/lib/index.js';
import { Semaphore, sleep } from '../util/async_util.mjs';
import { mkdir } from '../util/mkdir';

// const { app } = remote;

async function readFromDB(lowdDB) {
  for (let i = 0; i < 10; i += 1) {
    try {
      await lowdDB.read();
      return;
    } catch (err) {
      await sleep(1000);
    }
  }
}

export const getJSONDB = async (file) => {
  const adapter = new JSONFile(file);
  const db = new Low(adapter);
  await readFromDB(db);
  return db;
};

// async function saveDB(lowDB) {
//   for (let i = 0; i < 10; i += 1) {
//     try {
//       await lowDB.write();
//       return;
//     } catch (err) {
//       await sleep(1000);
//     }
//   }
// }

export const dbRoot = join(app.getPath('userData'), 'comma_data');
console.log('dbRoot:', dbRoot);

// const formatWord = (word) =>
//   word
//     .split("'")
//     .filter((w) => w.length > 0)
//     .join("'")
//     .split('-')
//     .filter((w) => w.length > 0)
//     .join('-');

// export const getWordVideos = async (word: string): Promise<Clip[]> => {
//   const localWord = formatWord(word);
//   const file = join(wordToVideosHomeDir, `${localWord}.json`);
//   const db = await getJSONDB(file);
//   if (db.data !== null) {
//     let result: Clip[] = [];
//     const data = db.data as { [file: string]: Clip[] };
//     const files = Object.keys(data);
//     for (const file of files) {
//       const clipsOfFile = data[file];
//       result = result.concat(
//         clipsOfFile.map((clip) => {
//           clip.file = file;
//           return clip;
//         })
//       );
//     }
//     return result;
//   }
//   return [] as Clip[];
// };

// export const addWordVideos = async (word: string, clips: Clip[]) => {
//   await init();
//   const localWord = formatWord(word);
//   if (localWord.length < 1) {
//     return;
//   }
//   const file = join(wordToVideosHomeDir, `${localWord}.json`);
//   const db = await getJSONDB(file);
//   if (db.data === null) {
//     db.data = {};
//   }
//   for (const clip of clips) {
//     let { file } = clip;
//     let group: Clip[] = db.data[file] || [];
//     let existed = group.find(
//       (c) => c.cutEnd === clip.cutEnd && c.cutStart === clip.cutStart
//     );
//     if (existed === undefined) {
//       group.push({
//         cutEnd: clip.cutEnd,
//         cutStart: clip.cutStart,
//       } as any);
//     }
//     db.data[file] = group;
//   }
//   saveDB(db);
// };

export const getVideoFileAbsolutePath = (videoFile: string) =>
  join(dbRoot, 'video_output', videoFile);

// export const setWordClips = async (word: string, clips: Clip[]) => {
//   await init();
//   const localWord = formatWord(word);
//   if (localWord.length < 1) {
//     return;
//   }
//   const file = join(wordToVideosHomeDir, `${localWord}.json`);
//   const db = await getJSONDB(file);
//   db.data = clips;
//   saveDB(db);
// };

// export const getVideoWords = async (videoFilePath) => {
//   await init();
//   const file = join(videoToWordsHomeDir, `${md5(videoFilePath)}.json`);
//   const db = await getJSONDB(file);
//   return db.data;
// };

// export const addVideoWords = async (videoFilePath, words) => {
//   await init();
//   const file = join(videoToWordsHomeDir, `${md5(videoFilePath)}.json`);
//   const db = await getJSONDB(file);
//   let prevData = db.data;
//   let prevWords = [];
//   if (
//     prevData !== null &&
//     prevData.words !== undefined &&
//     prevData.words.length > 0
//   ) {
//     prevWords = prevData.words;
//   }
//   db.data = {
//     file: videoFilePath,
//     words: [...new Set([...words, ...prevWords])].map((w) => formatWord(w)),
//   };
//   saveDB(db);
// };

// export const removeVideo = async (videoFilePath) => {
//   await init();
//   const file = join(videoToWordsHomeDir, `${md5(videoFilePath)}.json`);
//   const db = await getJSONDB(file);
//   const { words } = db.data;
//   const semaphore = new Semaphore(10);
//   // eslint-disable-next-line no-restricted-syntax
//   for (const word of words) {
//     try {
//       // eslint-disable-next-line no-await-in-loop
//       await semaphore.acquire();
//       getWordVideos(word)
//         .then((wordVideos) => {
//           if (
//             wordVideos === null ||
//             wordVideos.length === 0 ||
//             wordVideos.length === undefined
//           ) {
//             return;
//           }
//           const prevLength = wordVideos.length;
//           wordVideos = wordVideos.filter((f) => f !== videoFilePath);
//           const lengthNow = wordVideos.length;
//           console.log(
//             'word:',
//             word,
//             ', prev videos length:',
//             prevLength,
//             ', length now:',
//             lengthNow
//           );
//           if (lengthNow < prevLength) {
//             console.log('word:', word, ', videos length:', wordVideos.length);
//             return setWordVideos(word, wordVideos);
//           }
//         })
//         .finally(() => {
//           semaphore.release();
//         })
//         .catch((e) =>
//           console.error('modify word ', word, ' video file list error:', e)
//         );
//     } catch (err) {
//       console.warn('remove video file from word ', word, ' error:', err);
//     }
//   }
//   console.log('unlink video json file:', file);
//   fs.unlink(file);
// };
