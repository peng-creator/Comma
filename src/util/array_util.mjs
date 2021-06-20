export function pick(source) {
  const sumWeight = source.reduce((acc, curr) => {
    return acc + curr;
  }, 0);
  let currentPosition = 0;
  const divideList = source.map((weight) => {
    const nextPosition = currentPosition + weight / sumWeight;
    const divide = [currentPosition, nextPosition];
    currentPosition = nextPosition;
    return divide;
  });
  const rand = Math.random();
  for (let i = 0; i < divideList.length; i += 1) {
    const [start, end] = divideList[i];
    if (rand >= start && rand < end) {
      return i;
    }
  }
  return 0;
}

export function shuffle(list, seed) {
  let shuffleItem;
  let i = 0;
  let j = 0;

  if (!Array.isArray(list)) {
    return [];
  }

  const shuffledList = Array.from(list);

  if (shuffledList.length <= 2) {
    return shuffledList;
  }

  const localSeed = seed || 10000;

  for (i = 0; i < shuffledList.length - 2; i += 1) {
    j = (Math.round(Math.random() * localSeed) + i) % shuffledList.length;

    shuffleItem = shuffledList[i];
    shuffledList[i] = shuffledList[j];
    shuffledList[j] = shuffleItem;
  }

  return shuffledList;
}
