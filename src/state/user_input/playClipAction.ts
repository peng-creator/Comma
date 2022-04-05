import { BehaviorSubject } from 'rxjs';
import { Subtitle } from '../../types/Subtitle';

export const playSubtitle$ = new BehaviorSubject<Subtitle | null>(null);
