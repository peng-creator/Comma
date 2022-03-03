export interface Sentence {
  file: string; // 文章路径
  content: string; // 句子内容
  /**
   * 页数
   */
  page: number;
  //
  /**
   * 段落数
   */
  paragraph: number;
  //
  /**
   * 第几句
   */
  index: number;
}
