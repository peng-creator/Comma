import { promises as fs } from 'fs';
import { of, EMPTY, from } from 'rxjs';
import {
  combineLatestWith,
  debounceTime,
  mapTo,
  share,
  switchMap,
  tap,
} from 'rxjs/operators';
import { getVideoFileAbsolutePath } from '../database/db';
import { myPlayer, SubtitleStrategy } from '../player/player';
import { clipsToPlay$ } from '../state/reactive/clipsToPlay';
import { nextClipIndexToPlay$ } from '../state/user_input/nextClipIndexToPlay';
import { wordToPlay$ } from '../state/reactive/wordToPlay';
import { nextWordToPlayAction$ } from '../state/user_input/nextWordToPlayAction';
import { Clip } from '../types/WordClips';
import { studyRecord$ } from '../state/system/studyRecord';
import { StudyRecord } from '../types/StudyRecord';
import { saveStudyRecord } from '../database/wordbook';

const s1 = new SubtitleStrategy({
  color: 'rgb(243, 235, 165)',
  emphasisColor: 'rgb(128, 31, 115)',
  show: true,
  background: 'rgb(169, 118, 236)',
});

let _wordToPlay = '';

wordToPlay$.subscribe({
  next: (wordToPlay) => {
    _wordToPlay = wordToPlay;
  },
});

let prevClip: Clip | null = null;

let _clipsToPlay: Clip[] = [];

clipsToPlay$.subscribe({
  next: (clipsToPlay) => {
    _clipsToPlay = clipsToPlay;
  },
});

let _studyRecord: StudyRecord = {};
studyRecord$.subscribe({
  next: (studyRecord) => {
    _studyRecord = studyRecord;
  },
});

export const play$ = clipsToPlay$.pipe(
  switchMap((clips) => {
    console.log('clips in play effect:', clips);
    return nextClipIndexToPlay$.pipe(
      tap((index) => console.log('tap file index to play:', index)),
      combineLatestWith(of(clips))
    );
  }),
  debounceTime(10),
  switchMap(([index, clips]) => {
    console.log('playClips switchMap index:', index);
    console.log('playClips switchMap clips:', clips);
    if (clips.length === 0) {
      return EMPTY;
    }
    const clip = clips[index];
    if (prevClip === clip) {
      return EMPTY;
    }
    prevClip = clip;
    return from(
      (async () => {
        let { file } = clip;
        // file = getVideoFileAbsolutePath(file);
        try {
          console.log('try to figure out if file exists: ', file);
          const stat = await fs.stat(file);
          console.log('file does exist:', stat);
        } catch (err) {
          // 文件不存在。
          console.log('fs stat error:', err);
          // message.error(`文件不存在：${file}`);
          if (index + 1 < _clipsToPlay.length) {
            console.log(
              'next Clip Index To Play in playClips.ts line 65:',
              index + 1
            );
            nextClipIndexToPlay$.next(index + 1);
          } else {
            nextWordToPlayAction$.next('');
          }
          return;
        }
        const wordRecord = _studyRecord[_wordToPlay] || {
          playTimes: 0,
          level: 500,
        };
        wordRecord.playTimes += 1;
        _studyRecord[_wordToPlay] = wordRecord;
        console.log('studyRecord on playTimes change');
        saveStudyRecord(_studyRecord);
        try {
          await myPlayer.load({ ...clip, file }, _wordToPlay);
          await myPlayer.play([s1, s1, s1]);
          await myPlayer.play([
            { ...s1, show: false },
            { ...s1, show: false },
            { ...s1, show: false },
          ]);
          if (index + 1 < _clipsToPlay.length) {
            console.log(
              'next Clip Index To Play in playClips.ts line 83:',
              index + 1
            );
            nextClipIndexToPlay$.next(index + 1);
          } else {
            nextWordToPlayAction$.next('');
          }
        } catch (err) {
          console.log('word', _wordToPlay, ' play error:', err);
        }
      })()
    ).pipe(mapTo(index));
  }),
  share()
);
play$.subscribe();
