import { parseDialogue } from './dialogue.mjs';
import { parseFormat } from './format.mjs';

export function parse(text) {
  const tree = {
    info: {},
    styles: { format: [], style: [] },
    events: { format: [], comment: [], dialogue: [] },
  };
  const lines = text.split(/\r?\n/);
  let state = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^;/.test(line)) continue;

    if (/^\[Script Info\]/i.test(line)) state = 1;
    else if (/^\[V4\+? Styles\]/i.test(line)) state = 2;
    else if (/^\[Events\]/i.test(line)) state = 3;
    else if (/^\[.*\]/.test(line)) state = 0;
    if (state !== 3) {
      console.log('state !==3');
      continue;
    }
    if (state === 3) {
      if (/^Format\s*:/i.test(line)) {
        tree.events.format = parseFormat(line);
      }
      if (/^(?:Comment|Dialogue)\s*:/i.test(line)) {
        const [, key, value] = line.match(/^(\w+?)\s*:\s*(.*)/i);
        tree.events[key.toLowerCase()].push(
          parseDialogue(value, tree.events.format)
        );
      }
    }
  }

  return tree;
}
