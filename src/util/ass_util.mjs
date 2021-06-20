import { parse } from 'ass-compiler';

export function assContentToCutProject(assText) {
  const localAssText = assText.replace(/Dialogue:/gi, '\nDialogue:');
  const parsedASS = parse(localAssText);
  try {
    const { dialogue } = parsedASS.events;
    const result = dialogue.map(({ End, Start, Text }, i) => {
      const { parsed } = Text;
      const subtitles = parsed
        .map(({ text }) => text.replace(/\\N/g, ''))
        .filter((t) => t.length > 0);
      const words = subtitles
        .join(' ')
        .split(/[^a-zA-Z'-]+/)
        .map((s) => s.toLowerCase())
        .flat()
        .filter((s) => s.length > 1);
      let localStart;
      let localEnd;
      if (Number.isNaN(Start)) {
        localStart = 0;
      } else {
        localStart = Start * 1000;
      }
      if (Number.isNaN(End)) {
        localEnd = dialogue[i + 1].Start * 1000 - 1;
      } else {
        localEnd = End * 1000;
      }
      return {
        start: localStart,
        end: localEnd,
        words: [...new Set(words)],
        subtitles,
      };
    });
    console.log('cut project:', result);
    return result;
  } catch (e) {
    console.error('assContentToCutProject error:', e);
    return [];
  }
}
