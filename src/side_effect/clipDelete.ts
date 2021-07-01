import { Clip, WordClips } from '../types/WordClips';
import {
  clipsToPlay$,
  clipsToPlayOnClipChange$,
} from '../state/reactive/clipsToPlay';
import { wordToPlay$ } from '../state/reactive/wordToPlay';
import { deleteClipIndex$ } from '../state/user_input/deleteClipAction';
import {
  wordClips$,
  wordClipsFromCacheUpdate$,
} from '../state/reactive/wordClips';
import { nextWordToPlayAction$ } from '../state/user_input/nextWordToPlayAction';
import { nextClipIndexToPlay$ } from '../state/user_input/nextClipIndexToPlay';
import { setWordClips } from '../database/db';

let wordToPlay = '';
let clipsToPlay: Clip[] = [];
let localWordClips: WordClips = {};
let clipIndexToPlay = 0;

nextClipIndexToPlay$.subscribe({
  next: (clipIndex) => {
    clipIndexToPlay = clipIndex;
  },
});

wordClips$.subscribe({
  next: (wordClips) => {
    localWordClips = wordClips;
  },
});

wordToPlay$.subscribe({
  next: (word) => {
    wordToPlay = word;
  },
});

clipsToPlay$.subscribe({
  next: (clips) => {
    clipsToPlay = clips;
  },
});

deleteClipIndex$.subscribe({
  next: (index) => {
    if (index < 0) {
      return;
    }
    if (clipsToPlay.length < index + 1) {
      return;
    }
    console.log('before delete, clips to play:', clipsToPlay);
    console.log('delete index: ', index);
    const nextClipsToPlay = clipsToPlay.filter((clip, i) => i !== index);
    console.log('delete clip, next clips to play:', nextClipsToPlay);
    if (nextClipsToPlay.length === 0) {
      delete localWordClips[wordToPlay];
      wordClipsFromCacheUpdate$.next({ ...localWordClips });
      nextWordToPlayAction$.next('');
    } else {
      localWordClips[wordToPlay] = nextClipsToPlay;
      wordClipsFromCacheUpdate$.next({ ...localWordClips });
      clipsToPlayOnClipChange$.next(nextClipsToPlay);
      if (index < clipIndexToPlay) {
        // 如果删除的剪辑在正在播放的剪辑之前，为了保证不中断播放，调整正在播放的剪辑index
        nextClipIndexToPlay$.next(clipIndexToPlay - 1);
      }
    }
    setWordClips(wordToPlay, nextClipsToPlay);
  },
});
