import { BehaviorSubject } from 'rxjs';
import { Wordbook } from '../../database/wordbook';

export const selectedWordbook$ = new BehaviorSubject<Wordbook | null>(null);
