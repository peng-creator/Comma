import { BehaviorSubject } from 'rxjs';
import { Wordbook } from '../../database/wordbook';
import { wordImportAction$ } from './wordImportAction';

export const selectedWordbook$ = new BehaviorSubject<Wordbook | null>(null);

selectedWordbook$.subscribe({
  next: (wb) => {
    if (wb !== null && wb.words.length === 0) {
      setTimeout(() => {
        wordImportAction$.next('');
      }, 200);
    }
  },
});
