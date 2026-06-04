import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const locale = z.enum(['zh', 'ja', 'en']);

const site = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/site' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    defaultLocale: locale,
    supportedLocales: z.array(
      z.object({
        code: locale,
        label: z.string(),
        shortLabel: z.string(),
      }),
    ),
    navItems: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
      }),
    ),
    databaseJumpLinks: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
      }),
    ),
    hero: z.object({
      brandLines: z.array(z.string()),
      systemVersion: z.string(),
      coordinates: z.string(),
      status: z.string(),
      leftVertical: z.string(),
      rightVertical: z.string(),
      eyebrow: z.string(),
      title: z.string(),
      marquee: z.string(),
    }),
    sections: z.object({
      about: z.object({
        heading: z.string(),
        subheading: z.string(),
        body: z.array(z.string()),
        note: z.array(z.string()),
      }),
      database: z.object({
        heading: z.string(),
        subheading: z.string(),
      }),
      projects: z.object({
        heading: z.string(),
        subheading: z.string(),
        viewAllLabel: z.string(),
      }),
      log: z.object({
        heading: z.string(),
        subheading: z.string(),
      }),
    }),
    footer: z.object({
      tagline: z.string(),
      links: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
        }),
      ),
      disclaimer: z.array(z.string()),
      copyright: z.string(),
    }),
  }),
});

const artists = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/artists' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    code: z.string(),
    name: z.string(),
    romanizedName: z.string(),
    categoryId: z.string(),
    categoryTitle: z.string(),
    categorySubtitle: z.string(),
    categoryOrder: z.number(),
    itemOrder: z.number(),
    meta: z.string().optional(),
    statusLabel: z.string(),
    status: z.string(),
    inactive: z.boolean().optional(),
    image: z.string(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/projects' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    kind: z.string(),
    title: z.string(),
    description: z.string(),
    order: z.number(),
  }),
});

const logs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/logs' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    date: z.string(),
    type: z.string(),
    message: z.string(),
    order: z.number(),
  }),
});

export const collections = {
  site,
  artists,
  projects,
  logs,
};
