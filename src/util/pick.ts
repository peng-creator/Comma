export function pick(source: number[]) {
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
