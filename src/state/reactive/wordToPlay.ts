import { message } from 'antd';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap, debounceTime, take, filter } from 'rxjs/operators';
import { StudyRecord } from '../../types/StudyRecord';
import { WordClips } from '../../types/WordClips';
import { pick } from '../../util/pick';
import { studyRecord$ } from '../system/studyRecord';
import { nextWordToPlayAction$ } from '../user_input/nextWordToPlayAction';
import { prevWordToPlayAction$ } from '../user_input/prevWordToPlayAction';
import { wordsToPlay$ } from './wordsToPlay';

export const wordToPlay$ = new BehaviorSubject('');

let playWordHistoryStackLeft: string[] = [];
let wordPlaying = '';
let playWordHistoryStackRight: string[] = [];

wordToPlay$.subscribe({
  next: (wordToPlay) => {
    wordPlaying = wordToPlay;
  },
});

let prevWordsToPlay: string[] = [];
wordsToPlay$.subscribe({
  next: (wordsToPlay) => {
    if (wordsToPlay.length === 0) {
      wordToPlay$.next('');
    }
    const wordToPlayIsNotEmptyFromEmpty =
      prevWordsToPlay.length === 0 && wordsToPlay.length > 0;
    const wordPlayingNotIncluded = !wordsToPlay.includes(wordPlaying);
    if (wordToPlayIsNotEmptyFromEmpty || wordPlayingNotIncluded) {
      // 可播放列表从空转变为非空、正在播放的单词从可播放列表中移除时，发起切换播放单词。
      nextWordToPlayAction$.next('');
    }
    prevWordsToPlay = wordsToPlay;
  },
});

const pushToLeft = (word: string) => {
  if (word === '') {
    return;
  }
  playWordHistoryStackLeft.push(word);
  if (playWordHistoryStackLeft.length > 10) {
    playWordHistoryStackLeft.shift();
  }
};

const takeFromLeft = (): string => {
  if (playWordHistoryStackLeft.length > 0) {
    return playWordHistoryStackLeft.pop() || '';
  }
  return '';
};

const pushToRight = (word: string) => {
  if (word === '') {
    return;
  }
  playWordHistoryStackRight.push(word);
};

const takeFromRight = (): string => {
  if (playWordHistoryStackRight.length > 0) {
    return playWordHistoryStackRight.pop() || '';
  }
  return '';
};

const computeWordToPlay = (
  wordsToPlay: string[],
  studyRecord: StudyRecord
): string => {
  console.log('切换单词计算中。。。');
  if (wordsToPlay.length === 0) {
    console.log('没有可播放单词.');
    return '';
  }
  console.log('words to play:', wordsToPlay);
  const weightList = wordsToPlay.map((word) => {
    const { playTimes, level } = (studyRecord !== null &&
      studyRecord[word]) || {
      playTimes: 0,
      level: 500,
    };
    const weight = (Math.pow(70 / 69, level) + 1) / (playTimes + 1);
    if (Number.isNaN(weight)) {
      return 1;
    }
    return weight;
  });
  console.log('weightList:', weightList);
  const picked = pick(weightList);
  console.log('picked index:', picked);
  const wordPicked = wordsToPlay[picked];
  console.log('word picked:', wordPicked);
  return wordPicked;
};

nextWordToPlayAction$
  .pipe(
    switchMap(() => {
      return combineLatest([
        wordsToPlay$.pipe(filter((words) => words.length > 0)),
        studyRecord$,
      ]).pipe(debounceTime(10), take(1));
    })
  )
  .subscribe({
    next: ([wordsToPlay, studyRecord]) => {
      if (wordsToPlay.length === 0) {
        // message.warn('没有可播放的单词');
        return;
      }
      let nextWord = takeFromRight();
      if (nextWord === '') {
        console.log('wordPlaying:', wordPlaying);
        let selectPool = wordsToPlay.filter((word) => word !== wordPlaying);
        nextWord = computeWordToPlay(selectPool, studyRecord);
      }
      console.log('playWordHistoryStackLeft:', playWordHistoryStackLeft);
      console.log('playWordHistoryStackRight:', playWordHistoryStackRight);
      if (nextWord !== '') {
        pushToLeft(wordPlaying);
        wordToPlay$.next(nextWord);
      } else {
        message.warn('没有别的可播放单词!');
      }
    },
  });

prevWordToPlayAction$.subscribe({
  next: () => {
    let word = takeFromLeft();
    if (word === '') {
      message.warn('没有更多播放历史');
      return;
    }
    pushToRight(wordPlaying);
    console.log('playWordHistoryStackLeft:', playWordHistoryStackLeft);
    console.log('playWordHistoryStackRight:', playWordHistoryStackRight);
    wordToPlay$.next(word);
  },
});
