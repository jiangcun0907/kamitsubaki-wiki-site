import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const locale = z.enum(['zh', 'ja', 'en']);
const contentStatus = z.enum(['stub', 'published']).default('published');
const dateString = z.string().regex(
  /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/,
  'Expected YYYY, YYYY-MM, or YYYY-MM-DD',
);
const durationString = z.string().regex(
  /^\d{1,2}:\d{2}(?::\d{2})?$/,
  'Expected MM:SS or HH:MM:SS',
);
const siteRelativeOrHttpUrl = z.string().refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Must be an HTTP(S) URL or a site-relative path');
const seo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    noindex: z.boolean().optional(),
  })
  .optional();

const theme = z
  .object({
    name: z.string().optional(),
    accentColor: z.string(),
    mutedColor: z.string().optional(),
    surfaceColor: z.string().optional(),
    highlightColor: z.string().optional(),
    palette: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    ),
  })
  .optional();

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
        expandLabel: z.string().optional(),
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
      songs: z.object({
        heading: z.string(),
        subheading: z.string(),
        viewAllLabel: z.string().optional(),
      }),
      albums: z.object({
        heading: z.string(),
        subheading: z.string(),
        viewAllLabel: z.string().optional(),
        emptyLabel: z.string().optional(),
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
    socialContact: z
      .object({
        enabled: z.boolean().optional(),
        eyebrow: z.string(),
        title: z.string(),
        buttonLabel: z.string(),
        closeLabel: z.string(),
        helper: z.string().optional(),
        maxVisible: z.number().int().positive().optional(),
        items: z.array(
          z.object({
            label: z.string(),
            href: z.string(),
            handle: z.string().optional(),
            description: z.string().optional(),
            icon: z.string().optional(),
            enabled: z.boolean().optional(),
            featured: z.boolean().optional(),
          }),
        ),
      })
      .optional(),
    aiChat: z.object({
      title: z.string(),
      status: z.string(),
      buttonLabel: z.string(),
      closeLabel: z.string(),
      minimizeLabel: z.string(),
      inputLabel: z.string(),
      inputPlaceholder: z.string(),
      sendLabel: z.string(),
      keyboardHint: z.string(),
      modelModeLabel: z.string(),
      customModelLabel: z.string(),
      customModelPlaceholder: z.string(),
      thinkingModeLabel: z.string(),
      modelModes: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
        }),
      ),
      thinkingModes: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
        }),
      ),
      bubbleIdle: z.string(),
      bubbleThinking: z.string(),
      thinkingPhrases: z.array(z.string()).min(1),
      greeting: z.string(),
      fallbackOffline: z.string(),
      emptyResponse: z.string(),
      challengeFallback: z.string(),
      streamErrorFallback: z.string(),
      loginRequiredFallback: z.string(),
      accountAnonymous: z.string(),
      accountLoggedInPrefix: z.string(),
      logoutLabel: z.string(),
      authErrorFallback: z.string(),
      githubLoginLabel: z.string(),
      googleLoginLabel: z.string(),
      historyLabel: z.string(),
      historyEmpty: z.string(),
      newThreadLabel: z.string(),
      renameThreadLabel: z.string().optional(),
      deleteThreadLabel: z.string().optional(),
      clearHistoryLabel: z.string().optional(),
      renameThreadPrompt: z.string().optional(),
      deleteThreadConfirm: z.string().optional(),
      clearHistoryConfirm: z.string().optional(),
      quickPrompts: z.array(z.string()).min(1),
    }),
  }),
});

const artists = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/artists' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    contentStatus,
    code: z.string().optional(),
    name: z.string(),
    romanizedName: z.string(),
    categoryTitle: z.string().optional(),
    categorySubtitle: z.string().optional(),
    categoryOrder: z.number().optional(),
    itemOrder: z.number().optional(),
    meta: z.string().optional(),
    debutDate: z.string().optional(),
    profileTagline: z.string().optional(),
    designCredits: z.array(z.string()).optional(),
    affiliations: z.array(z.string()).optional(),
    officialLinks: z
      .array(
        z.object({
          label: z.string(),
          href: siteRelativeOrHttpUrl,
        }),
      )
      .optional(),
    featuredEntries: z
      .array(
        z.object({
          label: z.string(),
          href: siteRelativeOrHttpUrl,
          kind: z.enum(['artist', 'project', 'album', 'song']),
        }),
      )
      .optional(),
    theme,
    statusLabel: z.string(),
    status: z.string(),
    inactive: z.boolean().optional(),
    image: z.string(),
    seo,
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
    seo,
  }),
});

const logs = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/logs' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    date: z.string(),
    type: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    order: z.number(),
    seo,
  }),
});

const workBaseSchema = z.object({
    locale,
    translationKey: z.string(),
    title: z.string(),
    artist: z.string(),
    releaseDate: dateString.optional(),
    code: z.string().optional(),
    categoryTitle: z.string().optional(),
    categorySubtitle: z.string().optional(),
    categoryOrder: z.number().optional(),
    itemOrder: z.number().optional(),
    image: z.string().optional(),
    theme,
    seo,
});

const songs = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/songs' }),
  schema: workBaseSchema.extend({
    artistId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a lowercase URL slug'),
    artistIds: z
      .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a lowercase URL slug'))
      .min(1)
      .optional(),
    composer: z.string().optional(),
    lyricist: z.string().optional(),
    album: z.string().optional(),
    duration: durationString.optional(),
  }),
});

const albums = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/albums' }),
  schema: workBaseSchema.extend({
    romanizedTitle: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    label: z.string().optional(),
    catalogNumber: z.string().optional(),
    trackCount: z.number().int().nonnegative().optional(),
    duration: durationString.optional(),
    officialLinks: z
      .array(
        z.object({
          label: z.string(),
          href: siteRelativeOrHttpUrl,
        }),
      )
      .optional(),
    tracks: z
      .array(
        z.object({
          disc: z.number().int().positive().optional(),
          number: z.string().optional(),
          title: z.string(),
          artist: z.string().optional(),
          duration: durationString.optional(),
          songId: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

const announcements = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/announcements' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    date: z.string(),
    type: z.string(),
    title: z.string(),
    summary: z.string(),
    order: z.number().optional(),
    pinned: z.boolean().default(false),
  }),
});

const syntaxGuide = defineCollection({
  loader: glob({
    pattern: ['zh.md', 'ja.md', 'en.md'],
    base: new URL('./content/contribute/syntax-guide/', import.meta.url),
  }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    title: z.string(),
    description: z.string().optional(),
    seo,
  }),
});

const editGuide = defineCollection({
  loader: glob({ pattern: '{zh,ja,en}.md', base: './src/content/contribute/edit-guide' }),
  schema: z.object({
    locale,
    translationKey: z.literal('edit-guide'),
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    primaryAction: z.string(),
    journeyLabel: z.string(),
    journeySteps: z.array(z.string()).length(3),
    back: z.string(),
    targetLabel: z.string(),
    invalidTarget: z.string(),
    targetIntro: z.string(),
    switchLabel: z.string(),
    switchHint: z.string(),
    durationLabel: z.string(),
    outcomeLabel: z.string(),
    progressLabel: z.string(),
    resetLabel: z.string(),
    resetConfirm: z.string(),
    completeLabel: z.string(),
    completedLabel: z.string(),
    checkpointLabel: z.string(),
    aiHelpTitle: z.string(),
    aiHelpBody: z.string(),
    aiPrivacyNote: z.string(),
    aiContextLabel: z.string(),
    aiContextPlaceholder: z.string(),
    aiPromptPreviewLabel: z.string(),
    aiNoContext: z.string(),
    aiGuardrails: z.string(),
    aiCopyLabel: z.string(),
    aiCopiedLabel: z.string(),
    glossaryTitle: z.string(),
    glossary: z.array(
      z.object({
        term: z.string(),
        definition: z.string(),
      }),
    ),
    variants: z.array(
      z.object({
        key: z.enum(['beginner', 'web', 'new-entry', 'experienced']),
        label: z.string(),
        summary: z.string(),
        audience: z.string(),
        duration: z.string(),
        outcome: z.string(),
        entryMode: z.enum(['target', 'repository']).optional(),
        description: z.string(),
        sections: z.array(
          z.object({
            title: z.string(),
            summary: z.string(),
            body: z.string(),
            checkpoint: z.string(),
            action: z
              .object({
                label: z.string(),
                href: z.string(),
              })
              .optional(),
            aiPrompt: z.string().optional(),
          }),
        ),
        finalTitle: z.string(),
        finalBody: z.string(),
        finalLinkLabel: z.string(),
      }),
    ).length(4),
    docs: z.string(),
    docsPath: z.string(),
  }),
});

export const collections = {
  site,
  artists,
  projects,
  logs,
  announcements,
  editGuide,
  songs,
  albums,
  syntaxGuide,
};
