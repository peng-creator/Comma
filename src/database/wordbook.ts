import { promises as fs } from 'fs';
import path from 'path';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { StudyRecord } from '../types/StudyRecord';
import { sleep } from '../util/index.mjs';
import { mkdir } from '../util/mkdir';
import { getJSONDB, dbRoot } from './db';

export class Wordbook {
  words: string[] = [];

  name = '';

  constructor({ name, words }: { name: string; words: string[] }) {
    this.name = name;
    this.words = words || [];
  }

  add(word: string) {
    const w = this.words.find((w) => w === word);
    if (w === undefined) {
      this.words.push(word);
      return true;
    }
    return false;
  }

  remove(word: string) {
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

  copy() {
    return new Wordbook({ name: this.name, words: this.words });
  }
}

export const wordbooks = [];

export async function loadWordbooksFromDB() {
  const wordbookDir = path.join(dbRoot, 'wordbooks');
  console.log('loadWordbooksFromDB, dir:', wordbookDir);
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

const init = async () => {
  await Promise.race([initPromise, sleep(1000)]);
};

export async function getStudyRecord() {
  await init();
  const filePath = path.join(dbRoot, 'study_record.json');
  const db = await getJSONDB(filePath);
  if (db.data === null) {
    return {} as StudyRecord;
  }
  return db.data as StudyRecord;
}

const saveStudyRecord$ = new Subject<StudyRecord>();

saveStudyRecord$.pipe(debounceTime(1000)).subscribe({
  next: async (studyRecord) => {
    await init();
    const filePath = path.join(dbRoot, 'study_record.json');
    const db = await getJSONDB(filePath);
    db.data = studyRecord;
    return db.write().catch(() => {});
  },
});
export function saveStudyRecord(studyRecord: StudyRecord) {
  saveStudyRecord$.next(studyRecord);
}
