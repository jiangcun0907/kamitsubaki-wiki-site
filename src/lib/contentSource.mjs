import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderMarkdownDocument } from './markdown.mjs';

const frontmatterPattern = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u;

function resolveEntryPath(entry) {
  if (!entry?.filePath) throw new Error(`Content entry ${entry?.id ?? '(unknown)'} has no source file path.`);
  return resolve(process.cwd(), entry.filePath);
}

export async function readContentEntryBody(entry) {
  const filePath = resolveEntryPath(entry);
  const source = await readFile(filePath, 'utf8');
  return {
    body: source.replace(frontmatterPattern, '').trim(),
    fileURL: pathToFileURL(filePath),
  };
}

/**
 * @param {{ id?: string, filePath?: string }} entry
 * @returns {Promise<{
 *   html: string,
 *   headings: Array<{ depth: number, slug: string, text: string }>,
 *   metadata: Record<string, unknown>,
 *   body: string,
 * }>}
 */
export async function renderContentEntry(entry) {
  const { body, fileURL } = await readContentEntryBody(entry);
  const rendered = await renderMarkdownDocument(body, { fileURL });
  return { ...rendered, body };
}
