import path from 'path';
import { promises as fs } from 'fs';
import { getLogger } from './getLogger';
import { queryDict } from './dict';

const mdxPath = path.resolve(__dirname, '../../assets/collins.mdx');
const mdxPath0 = path.resolve(__dirname, '../assets/collins.mdx');

const findCollinsMdx = async () => {
  try {
    await fs.stat(mdxPath);
    return mdxPath;
  } catch (e) {
    return mdxPath0;
  }
};

const findCollinsMdxPromise = findCollinsMdx();

console.log('mdxPath __dirname:', __dirname);
console.log('mdxPath :', mdxPath);
console.log('mdxPath 0:', mdxPath0);

export const collins = async (w) => {
  const mdxPath = await findCollinsMdxPromise;
  console.log('mdxPath found:', mdxPath);
  return queryDict('collins', mdxPath, (root) => {
    const stars = root.querySelectorAll('.roundRed').length;
    const ukProns = root.querySelectorAll('.type_uk');
    const usProns = root.querySelectorAll('.type_us');
    const forms = root.querySelectorAll('a.orth');
    const wordForms = forms
      .map((form) => {
        const textContent = form.textContent.trim().slice(0, -1);
        console.log('form:', form);
        return { textContent, gramType: form.attributes.title };
      })
      .reduce(
        (acc, curr) => {
          acc.examples.push(`[${curr.gramType || ''}] ${curr.textContent}`);
          return acc;
        },
        { def: '词形', examples: [] }
      );
    const exampleDivs = root.querySelectorAll('div.collins_en_cn.example');
    if (exampleDivs.length === 0) {
      return [];
    }
    const detailExamples = exampleDivs
      .map((div) => {
        let defDiv = div.querySelector('div');
        let def = '';
        if (defDiv !== null) {
          def += defDiv.textContent;
        }
        if (def === '') {
          console.log('def not found, div is:', div);
          return null;
        }

        let syn = div.querySelector('.synonym');
        const exampleLi = div.querySelectorAll('li');
        const examples = exampleLi.map((li) => li.textContent);
        if (syn !== null) {
          examples.unshift(syn.textContent);
        }
        return {
          def,
          examples,
        };
      })
      .filter((e) => e !== null);
    const result = [
      {
        def: `${new Array(stars).fill('🌟').join('')} [UK]: / ${ukProns
          .map((p) => `${p.textContent}`)
          .join(' / ')} /  [US]: / ${usProns
          .map((p) => `${p.textContent}`)
          .join(' / ')} /`,
        examples: [],
      },
      ...detailExamples,
    ];
    if (wordForms.examples.length > 0) {
      result.unshift(wordForms);
    }
    return result;
  })(w);
};
