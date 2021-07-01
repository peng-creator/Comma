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
import { getWordVideos } from '../../database/db';
import { selectedWordbook$ } from '../user_input/selectedWordbook';
import { deleteWord$ } from '../user_input/deleteWordAction';
import { clipsLoading$ } from '../system/clipLoading$';

export const getWordClip$ = (words: string[]) => {
  if (words.length === 0) {
    return of({});
  }
  return from(words).pipe(
    mergeMap((word: string) => {
      console.log('getWordVideos(word):', word);
      return from(
        getWordVideos(word).then((clips) => ({ word, clips: clips || [] }))
      );
    }, 10),
    reduce((acc, { word, clips }) => {
      acc[word] = clips;
      return acc;
    }, {} as WordClips),
    shareReplay(1)
  );
};

let wordbookLoading: Wordbook | null = null;
let loading$: null | Observable<WordClips> = null;

let wordbookLoaded: Wordbook | null = null;
let _wordClips: WordClips = {};
deleteWord$
  .pipe(
    tap((word) => {
      delete _wordClips[word];
    })
  )
  .subscribe();

const wordClipsFromDB$ = selectedWordbook$.pipe(
  filter((wb) => wb !== null && wb !== undefined),
  switchMap((wb) => {
    if (loading$ !== null && wb?.name === wordbookLoading?.name) {
      return loading$;
    }
    // 同一个单词本只会从磁盘整本读取一次，如果发生更新，只需要读取相应单词后，使用 wordClipsFromCacheUpdate$ 进行更新。
    if (wb?.name === wordbookLoaded?.name) {
      return of(_wordClips);
    }
    wordbookLoading = wb;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    loading$ = getWordClip$(wb!.words);
    console.log('clipsLoading$.next(true);');
    console.log('clipsLoading$.next loading$:', loading$);
    clipsLoading$.next(true);
    loading$
      .pipe(
        finalize(() => {
          console.log('clipsLoading$.next(false);');
          clipsLoading$.next(false);
        })
      )
      .subscribe();
    return loading$;
  }),
  tap((wordClips) => {
    console.log('wordClipsFromDB wordClips:', wordClips);
    wordbookLoaded = wordbookLoading || wordbookLoaded;
    wordbookLoading = null;
    loading$ = null;
    _wordClips = wordClips;
  })
);

// 单词的删除、增加 都需要计算出最新的 wordClips ，然后推送到这个流中。
export const wordClipsFromCacheUpdate$ = new Subject<WordClips>();

selectedWordbook$.subscribe({
  next: () => {
    wordClipsFromCacheUpdate$.next({});
  },
});

export const wordClips$ = merge(
  wordClipsFromCacheUpdate$,
  wordClipsFromDB$
).pipe(
  tap((wordClips) => {
    _wordClips = wordClips;
  }),
  shareReplay(1)
);

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
  if (words.length === 0) {
    return;
  }
  words = [...new Set(words.filter((w) => wordsOfWordbook.has(w)))];
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
    return;
  }
  getWordClip$(words).subscribe({
    next: (loadedWordClips) => {
      wordClipsFromCacheUpdate$.next({
        ..._wordClips,
        ...loadedWordClips,
      });
    },
  });
};
