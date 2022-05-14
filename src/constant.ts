import PATH, { join } from 'path';
import { app } from '@electron/remote';
import { mkdir } from './util/mkdir';

export const defaultDbRoot = join(app.getPath('userData'), 'comma_data');
export const dbRoot = localStorage.getItem('dbRoot') || defaultDbRoot;

export const getAbsolutePath = (filePath: string) => {
  console.log('getAbsolutePath of:', filePath);
  if (filePath.startsWith(defaultDbRoot)) {
    return PATH.join(dbRoot, filePath.slice(defaultDbRoot.length));
  }
  return PATH.join(dbRoot, filePath);
};

mkdir(dbRoot);
