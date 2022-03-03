declare const WordFrequencyList: WordFrequency[];
export interface WordFrequency {
  word: string;
  rank: number;
  isGK: boolean;
  isCET4: boolean;
  isYJS: boolean;
}

export default WordFrequencyList;
