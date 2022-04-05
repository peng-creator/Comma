import { getCurrentWindow } from '@electron/remote';
import { of } from 'rxjs';
import MenuBuilder from '../../menu';

const currentWindow = getCurrentWindow();

const menuBuilder = new MenuBuilder(currentWindow);
export const menu$ = of(menuBuilder.buildMenu());
