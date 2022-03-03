import path from 'path';
import { getLogger } from './getLogger';
import { queryDict } from './dict';

const mdxPath = path.join(__dirname, './mdx/oald10.mdx');

export const oald = queryDict('oald', mdxPath, (root) => {
  const defs = root.querySelectorAll('deft>chn');
  const examples = root.querySelectorAll('.examples');
  const result = [];
  for (let i = 0; i < defs.length; i += 1) {
    const def = {
      def: defs[i].textContent,
      examples: [],
    };
    result.push(def);
    const exampleRoot = examples[i];
    if (exampleRoot === undefined) {
      continue;
    }
    const xzanples = exampleRoot.querySelectorAll('li');
    for (const e of xzanples) {
      def.examples.push(e.textContent);
    }
  }
  return result;
});
