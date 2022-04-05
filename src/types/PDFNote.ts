export type MarkMap = {
  [key: string]: string | undefined;
};

export type PDFNote = {
  firstKey: string;
  mergedStr: string;
  marks: MarkMap;
  file?: string;
};
