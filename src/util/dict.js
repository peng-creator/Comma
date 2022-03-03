import path from 'path';
import { parse } from 'node-html-parser';
import Mdict from 'mdict-js';
import fs from 'fs';
import { getLogger } from './getLogger';

export const queryDict = (dictName, mdxPath, parseDOM) => {
  const dict = new Mdict(mdxPath, {
    mode: 'mixed',
  });
  const log = getLogger(dictName);
  const query = (word) => {
    // const dictionary = await dictLoadPromise;
    log('starting lookup(word):', `--${word}--`);
    // const w = (await dictionary.lookup(word))[0];
    const resList = dict.lookup(word);
    log('resList:', resList);
    if (resList.length === 0) {
      return;
    }
    let res = resList.find((res) => !res.definition.startsWith('@@@LINK'));
    let w = '';
    if (res !== undefined) {
      w = res.definition;
    } else {
      w = resList[0].definition;
    }
    log('w:', w);
    // fs.writeFile(`${dictName}_${word}.html`, w, () => {});
    if (w.startsWith('@@@LINK=')) {
      const word = w.trim().slice('@@@LINK='.length, -3);
      return query(word);
    }
    if (w === undefined) {
      return [];
    }
    const root = parse(w);
    if (root === undefined) {
      return [];
    }
    const result = parseDOM(root);
    console.log('result:', result);
    return result;
  };
  return (word) => query(word) || [];
};
