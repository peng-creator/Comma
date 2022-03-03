import MiniSearch from 'minisearch';

import { promises as fs } from 'fs';
import { map, mergeMap } from 'rxjs/operators';
import { from } from 'rxjs';
import { getVideoFiles$ } from '../../video_process/getVideoFiles.mjs';
import { dbRoot } from '../db';
import { getConvertOutputPath } from '../../util/common.mjs';

let id = 0;

const loadSubtitles = () => {
  console.log('loadSubtitles dbRoot:', dbRoot);
  return getVideoFiles$([dbRoot]).pipe(
    mergeMap((file) => {
      console.log('got video file to add into search index:', file);
      const subtitlePath = getConvertOutputPath(file, 'json');
      console.log(`subtitle path: ${subtitlePath}`);
      return from(
        fs.readFile(subtitlePath, 'utf8').then((content) => JSON.parse(content))
      ).pipe(
        map((content) => {
          return {
            file,
            subtitle: content,
          };
        })
      );
    })
  );
};

export const miniSearch = new MiniSearch({
  fields: ['content'], // fields to index for full-text search
  storeFields: ['file', 'start', 'end'], // fields to return with search results
});

const initPromise = new Promise<void>((resolve, reject) => {
  loadSubtitles().subscribe({
    next: ({ file, subtitle }) => {
      miniSearch.addAll(
        subtitle.map((s: any, index: number) => {
          id += 1;
          let paddingLeft = '';
          let paddingRight = '';
          if (index > 0) {
            paddingLeft = subtitle[index - 1].subtitles.join(' ');
          }
          if (index < subtitle.length - 1) {
            paddingRight = subtitle[index + 1].subtitles.join(' ');
          }
          return {
            id,
            ...s,
            file,
            content: paddingLeft + s.subtitles.join(' ') + paddingRight,
          };
        })
      );
    },
    complete() {
      resolve();
    },
    error(err) {
      resolve();
    },
  });
});

export async function searchClip(word: string) {
  await initPromise;
  return miniSearch.search(word);
}
