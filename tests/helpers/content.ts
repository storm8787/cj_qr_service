import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MinwonDataset, MinwonItem, OfficeItem, TermItem } from '../../src/types/index.ts';

const root = resolve(import.meta.dirname, '../..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8')) as T;
}

const minwonData = readJson<{ dataset: MinwonDataset; items: MinwonItem[] }>(
  'src/data/minwon-items.json',
);

export const minwonDataset = minwonData.dataset;
export const minwonItems = minwonData.items;

export const termItems = readJson<{ items: TermItem[] }>('src/data/terms.json').items;
export const officeItems = readJson<{ items: OfficeItem[] }>('src/data/offices.json').items;

export const projectRoot = root;
