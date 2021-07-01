import { message } from 'antd';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Clip } from '../../types/WordClips';
import { clipsToPlay$ } from '../reactive/clipsToPlay';
import { nextClipIndexToPlayAction$ } from './nextClipIndexToPlayAction';
import { nextWordToPlayAction$ } from './nextWordToPlayAction';
import { prevClipIndexToPlayAction$ } from './prevClipIndexToPlayAction';

export const nextClipIndexToPlay$ = new BehaviorSubject<number>(0);

let clipsToPlay: Clip[] = [];
let prevClipIndex = 0;

clipsToPlay$.subscribe({
  next: (ctp) => {
    clipsToPlay = ctp;
  },
});

nextClipIndexToPlay$.subscribe({
  next: (index) => {
    prevClipIndex = index;
  },
});

nextClipIndexToPlayAction$.pipe(debounceTime(100)).subscribe({
  next: () => {
    let nextIndex = prevClipIndex + 1;
    if (nextIndex === clipsToPlay.length) {
      nextWordToPlayAction$.next(0);
    } else {
      console.log(
        'next Clip Index To Play in nextClipIndexToPlay.ts line 33:',
        nextIndex
      );
      nextClipIndexToPlay$.next(nextIndex);
    }
  },
});

prevClipIndexToPlayAction$.pipe(debounceTime(100)).subscribe({
  next: () => {
    let nextIndex = prevClipIndex - 1;
    if (nextIndex < 0) {
      message.warn('已经是第一个片段了');
    } else {
      console.log(
        'next Clip Index To Play in nextClipIndexToPlay.ts line 48:',
        nextIndex
      );
      nextClipIndexToPlay$.next(nextIndex);
    }
  },
});
