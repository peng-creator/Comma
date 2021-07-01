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
