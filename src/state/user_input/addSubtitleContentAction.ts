import { Subject } from 'rxjs';

type AddSubtitle = {
  content: string;
  start: number;
};

export const addSubtitleContentAction$ = new Subject<AddSubtitle>();
