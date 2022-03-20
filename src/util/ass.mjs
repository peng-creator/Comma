import { promises as fs } from 'fs';
import jschardet from 'jschardet';

import { assContentToCutProject } from './ass_util.mjs';

export class Ass {
  constructor(source) {
    this.source = source;
  }

  parse() {
    return assContentToCutProject(this.source).sort(
      (a, b) => a.start - b.start
    );
  }
}

Ass.saveByVideoSrc = async (file, subtitleContent) => {
  return fs.writeFile(
    `${file.slice(0, -4)}.json`,
    JSON.stringify(subtitleContent)
  );
};

Ass.loadByVideoSrc = async (file) => {
  try {
    const res = await fs.readFile(`${file.slice(0, -4)}.json`);
    return JSON.parse(res.toString());
  } catch (e) {
    const res = await fs.readFile(`${file.slice(0, -4)}.ass`);
    const { encoding } = jschardet.detect(res);
    return new Ass(res.toString(encoding)).parse();
  }
};
