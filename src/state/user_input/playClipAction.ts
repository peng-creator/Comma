import { BehaviorSubject } from 'rxjs';
import { Subtitle } from '../../types/Subtitle';
import { Clip } from '../../types/WordClips';

export const playSubtitle$ = new BehaviorSubject<Subtitle | null>(null);
