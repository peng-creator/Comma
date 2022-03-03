import { map, shareReplay, tap } from 'rxjs/operators';
import { selectedWordbook$ } from '../user_input/selectedWordbook';

export const wordsToPlay$ = selectedWordbook$.pipe(
  map((wordbook) => {
    return wordbook?.words || [];
  })
);
