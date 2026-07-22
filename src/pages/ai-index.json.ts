import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readContentEntryBody } from '../lib/contentSource.mjs';

export const prerender = true;

const maxIndexTextLength = 6000;

function cleanText(value: unknown, maxLength = maxIndexTextLength) {
  return String(value || '')
    .replace(/^---[\s\S]*?---/u, ' ')
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/[\[\]#*_>`~|]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength);
}

function articleRoute(collection: string, id: string) {
  const parts = id.split('/');
  const locale = parts.pop() || 'zh';
  return `/${locale}/${collection}/${parts.join('/')}/`;
}

function titleFor(entry: { data: Record<string, unknown> }) {
  return cleanText(
    entry.data.name || entry.data.title || entry.data.heading || entry.data.translationKey || '',
    180,
  );
}

export const GET: APIRoute = async ({ site }) => {
  const origin = (import.meta.env.PUBLIC_SITE_URL || site?.origin || 'https://kamitsubaki.wiki').replace(/\/$/u, '');
  const groups = await Promise.all([
    getCollection('artists'),
    getCollection('albums'),
    getCollection('songs'),
    getCollection('projects'),
    getCollection('logs'),
  ]);
  const collectionNames = ['artists', 'albums', 'songs', 'projects', 'logs'];
  const entries = [];

  for (const [groupIndex, group] of groups.entries()) {
    for (const entry of group) {
      const path = articleRoute(collectionNames[groupIndex], entry.id);
      const metadata = Object.values(entry.data)
        .filter((value) => typeof value === 'string' || Array.isArray(value))
        .join(' ');
      const { body } = await readContentEntryBody(entry);
      entries.push({
        title: titleFor(entry as { data: Record<string, unknown> }),
        url: `${origin}${path}`,
        locale: entry.data.locale,
        kind: collectionNames[groupIndex].replace(/s$/u, ''),
        text: cleanText(`${metadata} ${body}`),
      });
    }
  }

  return new Response(JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), entries }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
