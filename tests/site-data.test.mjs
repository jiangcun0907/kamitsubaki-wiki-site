import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildArtistCategories, sortByOrder } from '../src/lib/homeData.mjs';

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

test('nav items point to the four primary page sections', async () => {
  const { navItems } = await readJson('../src/content/site/zh.json');

  assert.deepEqual(
    navItems.map((item) => item.href),
    ['#about', '#database', '#projects', '#log'],
  );
});

test('artist database keeps the original four categories and key entities', async () => {
  const artistFiles = [
    'kaf',
    'rim',
    'harusaruhi',
    'isekaijoucho',
    'koko',
    'ciel',
    'albemuth',
    'kanzaki-iori',
    'guiano',
    'palow',
    'kafu',
    'sekai',
  ];
  const artistEntries = await Promise.all(
    artistFiles.map(async (id) => ({
      id,
      data: await readJson(`../src/content/artists/${id}.zh.json`),
    })),
  );
  const artistCategories = buildArtistCategories(artistEntries);

  assert.deepEqual(
    artistCategories.map((category) => category.id),
    ['cat-vwp', 'cat-solo', 'cat-creator', 'cat-isotope'],
  );

  const vwp = artistCategories.find((category) => category.id === 'cat-vwp');
  assert.equal(vwp.title, '虚拟世代的魔女们');
  assert.equal(vwp.items.length, 5);
  assert.deepEqual(vwp.items[0], {
    code: '01',
    name: '花谱',
    romanizedName: 'KAF',
    meta: 'DEBUT: 2018.10.18',
    statusLabel: 'STATUS',
    status: 'ACTIVE',
    image: 'https://placehold.co/1200x800/111/333?text=KAF',
  });
});

test('projects and log entries preserve the static page content', async () => {
  const projectFiles = ['kamitsubaki-city', 'sinsaekai-studio', 'witch-exhibition'];
  const projects = sortByOrder(
    await Promise.all(
      projectFiles.map(async (id) => ({
        id,
        data: await readJson(`../src/content/projects/${id}.zh.json`),
      })),
    ),
  ).map((entry) => entry.data);
  const logFiles = ['2024-06-01-vwp-live', '2024-05-15-city-timeline', '2024-04-30-rim-album'];
  const logEntries = sortByOrder(
    await Promise.all(
      logFiles.map(async (id) => ({
        id,
        data: await readJson(`../src/content/logs/${id}.zh.json`),
      })),
    ),
  ).map((entry) => entry.data);

  assert.equal(projects.length, 3);
  assert.equal(projects[0].title, '神椿市建设中。');
  assert.equal(projects[1].title, 'SINSAEKAI STUDIO');
  assert.equal(projects[2].title, '魔女展');

  assert.deepEqual(
    logEntries.map((entry) => entry.date),
    ['2024.06.01', '2024.05.15', '2024.04.30'],
  );
});
