import { BehaviorSubject } from 'rxjs';

export type DictEngine = {
  title: string;
  pattern: string;
};

const defaultDictEngineList: DictEngine[] = [
  {
    title: '有道',
    pattern: 'http://mobile.youdao.com/dict?le=eng&q={}',
  },
  {
    title: '欧陆',
    pattern: 'http://dict.eudic.net/mdicts/en/{}',
  },
];

const load = (): DictEngine[] => {
  return JSON.parse(
    localStorage.getItem('search_engine') ||
      `${JSON.stringify(defaultDictEngineList)}`
  );
};

const save = (engineList: DictEngine[]) => {
  localStorage.setItem('search_engine', JSON.stringify(engineList));
};

let engineList: DictEngine[] = load();

export const engineList$ = new BehaviorSubject(engineList);

export const addEngine = (e: DictEngine) => {
  engineList = [...engineList, e];
  save(engineList);
  engineList$.next(engineList);
};

export const removeEngine = (title: string) => {
  engineList = engineList.filter(({ title: t }) => t !== title);
  save(engineList);
  engineList$.next(engineList);
};
