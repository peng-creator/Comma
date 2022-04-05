import { SuperMemoItem } from 'supermemo';
import { Sentence } from './Article';
import { Subtitle } from './Subtitle';

export interface FlashCard extends SuperMemoItem {
  id: string;
  front: {
    word: string;
    subtitles: Subtitle[];
    sentences: Sentence[];
  };
  back: string;
  dueDate: number;
  clean?: boolean; // 是否为初始状态
  hasChanged?: boolean; // 是否发生变化
}
