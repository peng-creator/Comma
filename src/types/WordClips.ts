export interface Clip {
  file: string;
  cutStart: number;
  cutEnd: number;
}

export interface WordClips {
  [word: string]: Clip[];
}
