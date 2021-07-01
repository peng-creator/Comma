import { map, shareReplay, tap } from 'rxjs/operators';
import { wordClips$ } from './wordClips';

export const wordsToPlay$ = wordClips$.pipe(
  tap((wordsToPlay) => {
    console.log('tap in wordsToPlay$, wordsToPlay:', wordsToPlay);
  }),
  map((wordClips) => {
    const nextWordsToPlay = Object.keys(wordClips).filter(
      (word) => wordClips[word].length > 0
    );
    console.log('nextWordsToPlay:', nextWordsToPlay);
    return nextWordsToPlay;
  }),
  shareReplay(1)
);
