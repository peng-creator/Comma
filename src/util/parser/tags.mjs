const numTags = [
  'b',
  'i',
  'u',
  's',
  'fsp',
  'k',
  'K',
  'kf',
  'ko',
  'kt',
  'fe',
  'q',
  'p',
  'pbo',
  'a',
  'an',
  'fscx',
  'fscy',
  'fax',
  'fay',
  'frx',
  'fry',
  'frz',
  'fr',
  'be',
  'blur',
  'bord',
  'xbord',
  'ybord',
  'shad',
  'xshad',
  'yshad',
];

const numRegexs = numTags.map((nt) => ({
  name: nt,
  regex: new RegExp(`^${nt}-?\\d`),
}));

function isP(text) {
  for (let i = 0; i < numRegexs.length; i += 1) {
    const { name, regex } = numRegexs[i];
    if (regex.test(text)) {
      if (name === 'p') {
        return true;
      }
    }
  }
  return false;
}

export function isDraw(text) {
  const tags = [];
  let depth = 0;
  let str = '';
  // `\b\c` -> `b\c\`
  // `a\b\c` -> `b\c\`
  const transText = text.split('\\').slice(1).concat('').join('\\');
  for (let i = 0; i < transText.length; i += 1) {
    const x = transText[i];
    if (x === '(') depth += 1;
    if (x === ')') depth -= 1;
    if (depth < 0) depth = 0;
    if (!depth && x === '\\') {
      if (str) {
        tags.push(str);
      }
      str = '';
    } else {
      str += x;
    }
  }
  const isDrawing = tags.map(isP).includes(true);
  if (isDrawing) {
    console.log('tags:', tags);
  }
  return isDrawing;
}
