import { BehaviorSubject } from 'rxjs';

export const flashCardKeyword$ = new BehaviorSubject<string>(''); // 卡片关键字
