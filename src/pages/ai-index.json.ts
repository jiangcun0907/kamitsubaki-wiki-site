import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

function cleanText(value: unknown, maxLength = 12000) {
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
    getCollection('projects'),
    getCollection('logs'),
  ]);
  const collectionNames = ['artists', 'projects', 'logs'];
  const entries = groups.flatMap((group, groupIndex) =>
    group.map((entry) => {
      const path = articleRoute(collectionNames[groupIndex], entry.id);
      const metadata = Object.values(entry.data)
        .filter((value) => typeof value === 'string' || Array.isArray(value))
        .join(' ');
      return {
        title: titleFor(entry as { data: Record<string, unknown> }),
        url: `${origin}${path}`,
        locale: entry.data.locale,
        kind: collectionNames[groupIndex].replace(/s$/u, ''),
        text: cleanText(`${metadata} ${entry.body || ''}`),
      };
    }),
  );

  return new Response(JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), entries }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
