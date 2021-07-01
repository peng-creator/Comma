import { StudyRecord } from '../../types/StudyRecord';
import { WordClips } from '../../types/WordClips';

export type SortBy = 1 | 2 | 3;
export type Desc = -1 | 1;

export const sortWords = (
  words: string[],
  studyRecord: StudyRecord,
  wordClips: WordClips,
  sortBy: SortBy,
  desc: Desc
) => {
  return words.sort((a, b) => {
    let compare = 1;
    const { level: levelA, playTimes: playTimesA } = (studyRecord !== null &&
      studyRecord[a]) || {
      playTimes: 0,
      level: 500,
    };
    const { level: levelB, playTimes: playTimesB } = (studyRecord !== null &&
      studyRecord[b]) || {
      playTimes: 0,
      level: 500,
    };
    const countA = (wordClips[a] && wordClips[a].length) || 0;
    const countB = (wordClips[b] && wordClips[b].length) || 0;
    switch (sortBy) {
      case 1: // 剪辑数
        compare = countA - countB;
        break;
      case 2: // 生疏度
        compare = levelA - levelB;
        break;
      case 3: // 观看次数
        compare = playTimesA - playTimesB;
        break;
      default:
        break;
    }
    return desc * compare;
  });
};
