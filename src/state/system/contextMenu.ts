import { BehaviorSubject } from 'rxjs';

type ItemData = {
  onClick: () => void;
  title: string;
};

export type DynamicMenu = ItemData[][];

export const contextMenu$ = new BehaviorSubject<DynamicMenu>([]);

export const setContextMenu = (contextMenu: DynamicMenu) => {
  contextMenu$.next(contextMenu);
};
