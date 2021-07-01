import { map, mapTo, shareReplay, switchMap } from 'rxjs/operators';
import { promises as fs } from 'fs';
import rimraf from 'rimraf';
import { from, merge, Subject } from 'rxjs';
import { Clip, WordClips } from '../../types/WordClips';
import { wordToPlay$ } from './wordToPlay';
import { wordClips$ } from './wordClips';
import { thumbnailPath, thumbnailRemovePath } from '../../constant';
import { mkdir } from '../../util/mkdir';

let localWordClips: WordClips = {};

wordClips$.subscribe({
  next: (wordClips) => {
    localWordClips = wordClips;
  },
});

const clipsToPlayOnWordChange$ = wordToPlay$.pipe(
  map((word) => localWordClips[word] || []),
  switchMap((clips) => {
    console.log('rename path of thumbnail..');
    let renamePromise = fs.rename(thumbnailPath, thumbnailRemovePath);
    renamePromise
      .then(() => {
        return new Promise<void>((resolve) => {
          rimraf(thumbnailRemovePath, () => resolve());
        });
      })
      .catch((e) => console.log(e));
    let makeDirPromise = renamePromise
      .then(() => mkdir(thumbnailPath))
      .catch((e) => console.log(e));
    return from(makeDirPromise).pipe(mapTo(clips));
  })
);
export const clipsToPlayOnClipChange$ = new Subject<Clip[]>();

export const clipsToPlay$ = merge(
  clipsToPlayOnWordChange$,
  clipsToPlayOnClipChange$
).pipe(shareReplay(1));
