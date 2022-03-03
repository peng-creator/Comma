import { BehaviorSubject } from 'rxjs';
import { Sentence } from '../../types/Article';

export const openSentence$ = new BehaviorSubject<Sentence | null>(null);
