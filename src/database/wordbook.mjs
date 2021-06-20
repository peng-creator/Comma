import { promises as fs } from 'fs';
import path from 'path';
import { mkdir } from '../util/index.mjs';
import { getJSONDB, dbRoot } from './db.mjs';

export class Wordbook {
  constructor({ name }) {
    this.name = name;
    this.words = [];
  }

  add(word) {
    const w = this.words.find((w) => w === word);
    if (w === undefined) {
      this.words.push(word);
    }
  }

  remove(word) {
    const w = this.words.find((w) => w === word);
    if (w === undefined) {
      return;
    }
    const index = this.words.indexOf(w);
    this.words = [
      ...this.words.slice(0, index),
      ...this.words.slice(index + 1),
    ];
  }
}

export const wordbooks = [];

export async function loadWordbooksFromDB() {
  const wordbookDir = path.join(dbRoot, 'wordbooks');
  await mkdir(wordbookDir);
  const files = await fs.readdir(wordbookDir);
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    const filePath = path.join(wordbookDir, file);
    // eslint-disable-next-line no-await-in-loop
    const { data: wordbook } = await getJSONDB(filePath);
    console.log('wordbook loaded with lowDB:', wordbook);
    Object.setPrototypeOf(wordbook, Wordbook.prototype);
    wordbooks.push(wordbook);
  }
  return wordbooks;
}

export async function delWordbook(wordbook) {
  console.log('del wordbook....');
  try {
    const filePath = path.join(dbRoot, 'wordbooks', `${wordbook.name}.json`);
    fs.unlink(filePath);
  } catch (e) {
    console.log('del wordbook error....', e);
  }
}

export async function saveWordbook(wordbook) {
  console.log('saving wordbook....');
  try {
    const filePath = path.join(dbRoot, 'wordbooks', `${wordbook.name}.json`);
    const lowDB = await getJSONDB(filePath);
    lowDB.data = wordbook;
    await lowDB.write();
  } catch (e) {
    console.log('saveWordbook error....', e);
  }
}

const initPromise = mkdir(dbRoot);

export async function getStudyRecord() {
  await initPromise;
  const filePath = path.join(dbRoot, 'study_record.json');
  const db = await getJSONDB(filePath);
  return db.data;
}

export async function saveStudyRecord(studyRecord) {
  await initPromise;
  const filePath = path.join(dbRoot, 'study_record.json');
  const db = await getJSONDB(filePath);
  db.data = studyRecord;
  return db.write().catch(() => {});
}
