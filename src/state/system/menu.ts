import { remote } from 'electron';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import MenuBuilder from '../../menu';
import { selectedWordbook$ } from '../user_input/selectedWordbook';
import { wordbooks$ } from './wordbooks';

const currentWindow = remote.getCurrentWindow();

const menuBuilder = new MenuBuilder(currentWindow);

export const menu$ = wordbooks$.pipe(
  switchMap((wordbooks) => {
    return selectedWordbook$.pipe(
      map((wb) => menuBuilder.buildMenu(wordbooks, wb))
    );
  }),
  shareReplay(1)
);
