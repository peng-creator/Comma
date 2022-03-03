const dayjs = require('dayjs');
const { supermemo } = require('supermemo');

function practice(flashcard, grade) {
  const { interval, repetition, efactor } = supermemo(flashcard, grade);
  const dueDate = dayjs(Date.now()).add(interval, 'day').toISOString();
  return { ...flashcard, interval, repetition, efactor, dueDate };
}

let flashcard = {
  front: 'programer',
  back: 'an organism that turns caffeine in software',
  interval: 0,
  repetition: 0,
  efactor: 2.5,
  dueDate: dayjs(Date.now()).toISOString(),
};

console.log(flashcard);

flashcard = practice(flashcard, 5);
console.log(flashcard);

flashcard = practice(flashcard, 4);
console.log(flashcard);

flashcard = practice(flashcard, 3);
console.log(flashcard);

flashcard = practice(flashcard, 2);
console.log(flashcard);

flashcard = practice(flashcard, 1);
console.log(flashcard);
