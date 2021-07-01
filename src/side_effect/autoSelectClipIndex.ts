import { wordToPlay$ } from '../state/reactive/wordToPlay';
import { nextClipIndexToPlay$ } from '../state/user_input/nextClipIndexToPlay';

wordToPlay$.subscribe(() => {
  console.log('next Clip Index To Play in autoSelectClipIndex.ts line 5:', 0);
  nextClipIndexToPlay$.next(0);
});
