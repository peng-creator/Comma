import { join } from 'path';
import { remote } from 'electron';
import { mkdir } from './util/mkdir';

const { app } = remote;

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
