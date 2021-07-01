import path from 'path';

export const getConvertOutputPath = (file, aimExt, outDir) => {
  const basename = path.basename(file);
  const ext = path.extname(file);
  if (!outDir) {
    outDir = path.dirname(file);
  }
  return `${outDir}/${basename.slice(
    0,
    basename.length - ext.length
  )}.${aimExt}`;
};
