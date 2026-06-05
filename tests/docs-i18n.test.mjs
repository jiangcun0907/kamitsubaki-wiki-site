import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const localizedDocs = [
  'docs/contributing.md',
  'docs/contributing.en.md',
  'docs/contributing.ja.md',
  'docs/architecture.md',
  'docs/architecture.en.md',
  'docs/architecture.ja.md',
];

async function fileExists(path) {
  try {
    await access(new URL(`../${path}`, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test('documentation exists in Chinese, English, and Japanese', async () => {
  for (const docPath of localizedDocs) {
    assert.equal(await fileExists(docPath), true, `${docPath} should exist`);
  }
});

test('readme files link to documentation in their own language', async () => {
  const zh = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const en = await readFile(new URL('../README.en.md', import.meta.url), 'utf8');
  const ja = await readFile(new URL('../README.ja.md', import.meta.url), 'utf8');

  assert.match(zh, /\(docs\/contributing\.md\)/);
  assert.match(zh, /\(docs\/architecture\.md\)/);
  assert.match(en, /\(docs\/contributing\.en\.md\)/);
  assert.match(en, /\(docs\/architecture\.en\.md\)/);
  assert.match(ja, /\(docs\/contributing\.ja\.md\)/);
  assert.match(ja, /\(docs\/architecture\.ja\.md\)/);
});
