import { join } from 'path';
import { app } from '@electron/remote';
import { mkdir } from './util/mkdir';

export const dbRoot = join(app.getPath('userData'), 'comma_data');
export const thumbnailPath = join(
  app.getPath('userData'),
  'comma_data',
  'thumbnail'
);
export const thumbnailRemovePath = join(
  app.getPath('userData'),
  'comma_data',
  'thumbnail_to_remove'
);

mkdir(dbRoot);
mkdir(thumbnailPath);
