import {
  map,
  mapTo,
  mergeMap,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { promises as fs } from 'fs';
import rimraf from 'rimraf';
import { from, merge, Subject } from 'rxjs';
import { Clip } from '../../types/WordClips';
import { wordToPlay$ } from './wordToPlay';
import { thumbnailPath, thumbnailRemovePath } from '../../constant';
import { mkdir } from '../../util/mkdir';
import { miniSearch, searchClip } from '../../database/search';

const clipsToPlayOnWordChange$ = wordToPlay$.pipe(
  mergeMap((word) => {
    return from(searchClip(word));
  }),
  switchMap((clips) => {
    console.log('miniSearch search result:', clips);
    console.log('rename path of thumbnail..');
    let renamePromise = fs.rename(thumbnailPath, thumbnailRemovePath);
    renamePromise
      .then(() => {
        return new Promise<void>((resolve, reject) => {
          rimraf(thumbnailRemovePath, (e) => {
            if (e === null || e === undefined) {
              resolve();
            } else {
              reject(e);
            }
          });
        });
      })
      .catch((e) => console.log(e));
    let makeDirPromise = renamePromise
      .then(() => mkdir(thumbnailPath))
      .catch((e) => console.log(e));
    return from(makeDirPromise).pipe(mapTo(clips));
  }),
  tap((clips) => {
    console.log('clipsToPlayOnWordChange:', clips);
  })
);
export const clipsToPlayOnClipChange$ = new Subject<Clip[]>();

export const clipsToPlay$ = merge(
  clipsToPlayOnWordChange$,
  clipsToPlayOnClipChange$
).pipe(shareReplay(1));
