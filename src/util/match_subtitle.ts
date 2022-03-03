import { promises as fs } from 'fs';
import path from 'path';

const dir = '/Users/peng/Downloads/cutsource';
async function main() {
  const innerFiles = await fs.readdir(dir);
  const subtitleFiles = innerFiles.filter((file) => file.endsWith('.ass'));
  const videoFiles = innerFiles.filter(
    (file) => file.endsWith('.mkv') || file.endsWith('.mp4')
  );
  for (let i = 0; i < videoFiles.length; i += 1) {
    const videoFile = videoFiles[i];
    const basename = path.basename(videoFile);
    const ext = path.extname(basename);
    const fileName = basename.slice(0, basename.length - ext.length);
    console.log('source:', path.join(dir, subtitleFiles[i]));
    console.log('dest:', path.join(dir, `${fileName}.ass`));
    fs.rename(
      path.join(dir, subtitleFiles[i]),
      path.join(dir, `${fileName}.ass`)
    );
  }
}
main();
