const songCategoryDefinitions = {
  originals: {
    order: 10,
    label: { zh: '原创曲', ja: 'オリジナル曲', en: 'Original Songs' },
    subtitle: 'ORIGINALS',
  },
  covers: {
    order: 20,
    label: { zh: '翻唱曲', ja: 'カバー曲', en: 'Covers' },
    subtitle: 'COVERS',
  },
  genealogy: {
    order: 30,
    label: { zh: '系谱曲', ja: '系譜曲', en: 'Genealogy Songs' },
    subtitle: 'GENEALOGY',
  },
  suites: {
    order: 40,
    label: { zh: '组曲', ja: '組曲', en: 'Suite Songs' },
    subtitle: 'SUITES',
  },
  collaborations: {
    order: 50,
    label: { zh: '合作曲', ja: 'コラボ楽曲', en: 'Collaborations' },
    subtitle: 'COLLABORATIONS',
  },
  projects: {
    order: 60,
    label: { zh: '企划曲', ja: 'プロジェクト楽曲', en: 'Project Songs' },
    subtitle: 'PROJECT SONGS',
  },
};

const categoryAliases = {
  original: 'originals',
  cover: 'covers',
  genealogy_songs: 'genealogy',
  'genealogy-songs': 'genealogy',
  suite: 'suites',
  collaboration: 'collaborations',
  project: 'projects',
  'project-songs': 'projects',
};

function compareOptionalNumber(left, right) {
  return (left ?? Number.POSITIVE_INFINITY) - (right ?? Number.POSITIVE_INFINITY);
}

function humanizeCategorySlug(slug) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function canonicalCategorySlug(slug) {
  return categoryAliases[slug] ?? slug;
}

function getEntryContentPath(entryId) {
  return entryId.split('/').slice(0, -1).join('/');
}

function getArtistEntrySlug(entry) {
  return getEntryContentPath(entry.id).split('/').at(-1);
}

function findArtistEntry(artistEntries, artistSlug) {
  return artistEntries.find((entry) =>
    entry.data.translationKey === artistSlug || getArtistEntrySlug(entry) === artistSlug,
  );
}

export function toArtistSlug(artist) {
  return artist
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

export function toArtistAnchor(artist) {
  return `artist-${toArtistSlug(artist)}`;
}

export function parseSongCatalogPath(entryId, artistId) {
  const songPath = getEntryContentPath(entryId);
  const parts = songPath.split('/').filter(Boolean);
  const songSlug = parts.at(-1) ?? 'unknown';
  const catalogFolders = parts.slice(0, -1);
  let categorySlug = 'uncategorized';

  // Preferred structure: artist/category/song/locale.md
  if (catalogFolders[0] === artistId && catalogFolders[1]) {
    categorySlug = catalogFolders[1];
  // Backward compatibility: artist-category/song/locale.md
  } else if (catalogFolders[0]?.startsWith(`${artistId}-`)) {
    categorySlug = catalogFolders[0].slice(artistId.length + 1) || categorySlug;
  } else if (catalogFolders.at(-1)) {
    categorySlug = catalogFolders.at(-1);
  }

  return {
    artistSlug: artistId,
    categorySlug: canonicalCategorySlug(categorySlug),
    songSlug,
    songPath,
  };
}

export function getSongCategoryMeta(categorySlug, locale = 'en', entryData = {}) {
  const canonicalSlug = canonicalCategorySlug(categorySlug);
  const definition = songCategoryDefinitions[canonicalSlug];

  return {
    slug: canonicalSlug,
    title: definition?.label[locale] ?? entryData.categoryTitle ?? humanizeCategorySlug(canonicalSlug),
    subtitle: definition?.subtitle ?? entryData.categorySubtitle ?? canonicalSlug.replace(/[-_]/g, ' ').toUpperCase(),
    order: entryData.categoryOrder ?? definition?.order ?? Number.POSITIVE_INFINITY,
  };
}

export function groupSongsByCategory(entries, artistSlug, locale = 'en') {
  const categories = new Map();

  for (const entry of entries) {
    const path = parseSongCatalogPath(entry.id, artistSlug);
    const metadata = getSongCategoryMeta(path.categorySlug, locale, entry.data);
    const category = categories.get(metadata.slug) ?? {
      ...metadata,
      id: `song-category-${metadata.slug}`,
      entries: [],
    };

    category.order = Math.min(category.order, metadata.order);
    category.entries.push(entry);
    categories.set(metadata.slug, category);
  }

  return [...categories.values()]
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, locale))
    .map((category) => ({
      ...category,
      entries: category.entries.sort((left, right) =>
        compareOptionalNumber(left.data.itemOrder, right.data.itemOrder)
        || (left.data.releaseDate ?? '').localeCompare(right.data.releaseDate ?? '')
        || left.data.title.localeCompare(right.data.title, locale),
      ),
    }));
}

export function groupMusicByArtist(entries, locale = 'en', artistEntries = []) {
  const groups = new Map();

  for (const entry of entries) {
    const artist = entry.data.artist.trim();
    const slug = entry.data.artistId?.trim() || toArtistSlug(artist);
    const artistEntry = findArtistEntry(artistEntries, slug);
    const group = groups.get(slug) ?? {
      artist,
      slug,
      id: `artist-${slug}`,
      entries: [],
      artistEntry,
      artistPath: artistEntry ? getEntryContentPath(artistEntry.id) : undefined,
      cover: artistEntry?.data.image,
      romanizedName: artistEntry?.data.romanizedName,
      theme: artistEntry?.data.theme,
      order: artistEntry?.data.categoryOrder,
      itemOrder: artistEntry?.data.itemOrder,
    };
    group.entries.push(entry);
    groups.set(slug, group);
  }

  return [...groups.values()].sort((left, right) =>
    compareOptionalNumber(left.order, right.order)
    || compareOptionalNumber(left.itemOrder, right.itemOrder)
    || left.artist.localeCompare(right.artist, locale, { numeric: true }),
  );
}

export function buildArtistSongCatalog(songEntries, artistEntries, locale = 'en') {
  return groupMusicByArtist(songEntries, locale, artistEntries).map((group) => ({
    ...group,
    categories: groupSongsByCategory(group.entries, group.slug, locale),
  }));
}
