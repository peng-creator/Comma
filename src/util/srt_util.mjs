import srtParser2 from 'srt-parser-2';
import { timeToMilliseconds } from './time_util.mjs';

export function srtContentToCutProject(content) {
  const { default: Parser } = srtParser2;
  console.log('srtContentToCutProject:', Parser);
  console.log('srtContentToCutProject content:', content);
  const parser = new Parser();
  const result = parser.fromSrt(content);
  return result
    .map(({ id, startTime, endTime, text }) => {
      console.log('text:', text);
      const div = document.createElement('div');
      div.innerHTML = text;
      text = div.textContent; // 脱去 text 里的标签。
      return {
        id,
        start: timeToMilliseconds(startTime.replace(',', '.')),
        end: timeToMilliseconds(endTime.replace(',', '.')),
        subtitles: [text.replaceAll(/\s/g, ' ')],
      };
    })
    .reduce((acc, curr) => {
      let last = acc[acc.length - 1];
      if (last && last.subtitles[0].endsWith(',')) {
        last.end = curr.end;
        last.subtitles[0] = `${last.subtitles[0]} ${curr.subtitles[0]}`;
      } else {
        acc.push(curr);
      }
      return acc;
    }, []);
}
