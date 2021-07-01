import { promises as fs } from 'fs';
import path from 'path';

export async function mkdir(p: string) {
  try {
    return await fs.stat(p);
  } catch (err) {
    const parent = path.resolve(p, '..');
    await mkdir(parent);
    try {
      return await fs.mkdir(p);
    } catch (err) {
      console.warn('fs.mkdir of ', p, 'error: ', err);
    }
  }
}
