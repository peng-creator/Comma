export interface StudyRecord {
  [word: string]: {
    playTimes: number;
    level: number;
  };
}
