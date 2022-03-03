import {
  filter,
  finalize,
  mergeMap,
  reduce,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { from, merge, Observable, of, Subject } from 'rxjs';
import { Wordbook } from '../../database/wordbook';
import { WordClips } from '../../types/WordClips';
import { selectedWordbook$ } from '../user_input/selectedWordbook';
import { deleteWord$ } from '../user_input/deleteWordAction';

let wordbookLoaded: Wordbook | null = null;
let _wordClips: WordClips = {};
deleteWord$
  .pipe(
    tap((word) => {
      delete _wordClips[word];
    })
  )
  .subscribe();

// 单词的删除、增加 都需要计算出最新的 wordClips ，然后推送到这个流中。
export const wordClipsFromCacheUpdate$ = new Subject<WordClips>();

selectedWordbook$.subscribe({
  next: (wb) => {
    if (
      wb === null ||
      wordbookLoaded === null ||
      wb.name !== wordbookLoaded.name
    ) {
      wordClipsFromCacheUpdate$.next({});
    }
  },
});

let wordsOfWordbook: Set<string> = new Set();
selectedWordbook$.subscribe({
  next: (wb) => {
    if (wb !== null) {
      wordsOfWordbook = new Set(wb.words);
    }
  },
});

export const partialUpdate = (
  words: string[],
  wordClipsToSelectFrom?: WordClips
) => {
  console.log(
    'partialUpdate, words:',
    words,
    ', wordClipsToSelectFrom:',
    wordClipsToSelectFrom
  );
  if (words.length === 0) {
    return;
  }
  words = [...new Set(words.filter((w) => wordsOfWordbook.has(w)))];
  console.log('words in wordsOfWordbook:', words);
  if (words.length === 0) {
    return;
  }
  if (wordClipsToSelectFrom !== undefined) {
    for (const word of words) {
      let prevClips = _wordClips[word] || [];
      let newClips = wordClipsToSelectFrom[word] || [];
      let nextClips = [
        ...prevClips,
        ...newClips.filter((nc) => {
          let prevClip = prevClips.find(
            (c) =>
              nc.file === c.file &&
              nc.cutEnd === c.cutEnd &&
              nc.cutStart === c.cutStart
          );
          return prevClip === undefined;
        }),
      ];
      if (nextClips.length > 0) {
        _wordClips[word] = nextClips;
      }
    }
    wordClipsFromCacheUpdate$.next({
      ..._wordClips,
    });
  }
};
