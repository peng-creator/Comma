import { getCurrentWindow } from '@electron/remote';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import MenuBuilder from '../../menu';
import { selectedWordbook$ } from '../user_input/selectedWordbook';
import { wordbooks$ } from './wordbooks';

const currentWindow = getCurrentWindow();

const menuBuilder = new MenuBuilder(currentWindow);

export const menu$ = wordbooks$.pipe(
  switchMap((wordbooks) => {
    return selectedWordbook$.pipe(
      map((wb) => {
        console.log('menuBuilder:', menuBuilder);
        return menuBuilder.buildMenu(wordbooks, wb);
      })
    );
  }),
  shareReplay(1)
);
