export type MarkMap = {
  [key: string]: string | undefined | boolean;
};

export type PDFNote = {
  firstKey: string;
  mergedStr: string;
  marks: MarkMap;
  file?: string;
  id?: string;
};
