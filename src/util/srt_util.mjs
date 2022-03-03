import srtParser2 from 'srt-parser-2';

export function srtContentToCutProject(content) {
  const { default: Parser } = srtParser2;
  console.log('srtContentToCutProject:', Parser);
  console.log('srtContentToCutProject content:', content);
  const parser = new Parser();
  const result = parser.fromSrt(content);
  console.log('srtContentToCutProject result:', result);
}
