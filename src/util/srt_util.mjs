import srtParser2 from 'srt-parser-2';
import { timeToMilliseconds } from './time_util.mjs';

export function srtContentToCutProject(content) {
  const { default: Parser } = srtParser2;
  console.log('srtContentToCutProject:', Parser);
  console.log('srtContentToCutProject content:', content);
  const parser = new Parser();
  const result = parser.fromSrt(content);
  return result.map(({id, startTime, endTime, text}) => {
    return {
      id,
      start: timeToMilliseconds(startTime.replace(',', '.')),
      end: timeToMilliseconds(endTime.replace(',', '.')),
      subtitles: [text],
    }
  });
}
