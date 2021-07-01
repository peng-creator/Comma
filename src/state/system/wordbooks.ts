import { BehaviorSubject } from 'rxjs';
import { loadWordbooksFromDB, Wordbook } from '../../database/wordbook';
import { newWordbookAction$ } from '../user_input/newWordbookAction';
import { selectedWordbook$ } from '../user_input/selectedWordbook';

export const wordbooks$ = new BehaviorSubject<Wordbook[]>([]);

loadWordbooksFromDB()
  .then((wbs) => {
    if (wbs.length > 0) {
      wordbooks$.next(wbs);
      selectedWordbook$.next(wbs[0]);
    } else {
      newWordbookAction$.next('');
    }
  })
  .catch((e) => console.error('load wordbooks from db error:', e));
