import { promises as fs } from 'fs';
import path from 'path';
import { Observable } from 'rxjs';

export function getVideoFiles$(sourcePathList) {
  return new Observable((observer) => {
    (async () => {
      const files = [...sourcePathList];
      for (const file of files) {
        const stat = await fs.stat(file);
        if (stat.isDirectory()) {
          const innerFiles = await fs.readdir(file);
          for (const innerFile of innerFiles) {
            files.push(path.join(file, innerFile));
          }
          continue;
        }
        const basename = path.basename(file);
        const extname = path.extname(file);
        const isHidingFile = basename.startsWith('.');
        const notMkvNorMp4 =
          !extname.endsWith('mkv') && !extname.endsWith('mp4');
        if (isHidingFile || notMkvNorMp4) {
          continue;
        }
        console.log('next video file:', file);
        observer.next(file);
      }
      observer.complete();
    })().catch((e) => {
      console.log(`get video files error: ${e.message}`);
      observer.error(e);
    });
  });
}
