import { debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';

export const tapWord$ = new Subject<string>();

const sentence$ = new Subject<string>();

sentence$.pipe(debounceTime(100)).subscribe({
  next(s) {
    s.split(/\s/).forEach((w) => {
      tapWord$.next(w);
    });
  },
});

export const searchSentence = (s: string) => {
  sentence$.next(s);
};
