export const stringFolder = (sourceStr: string, foldLength: number) => {
  if (sourceStr.length <= foldLength) {
    return sourceStr;
  }
  return `${sourceStr.slice(0, foldLength - 3)}...${sourceStr.slice(
    sourceStr.length - 3
  )}`;
};
