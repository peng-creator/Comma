import path from 'path';
import { getLogger } from './getLogger';
import { queryDict } from './dict';

const mdxPath = path.join(__dirname, './mdx/macmillan_thesaurus.mdx');

export const macmillanThesaurusy = queryDict(
  'macmillan_thesaurus',
  mdxPath,
  (root) => {
    const thesaurusList = root.querySelectorAll('.tyc');
    const chinese = root.querySelector('div.zm>a');
    return thesaurusList
      .map((span) => span.textContent)
      .map((thesaurus) => {
        return {
          def: thesaurus,
          examples: [chinese.textContent],
        };
      });
  }
);
