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

export function groupMusicByArtist(entries, locale = 'en') {
  const groups = new Map();

  for (const entry of entries) {
    const artist = entry.data.artist.trim();
    const slug = entry.data.artistId?.trim() || toArtistSlug(artist);
    const group = groups.get(slug) ?? { artist, slug, id: `artist-${slug}`, entries: [] };
    group.entries.push(entry);
    groups.set(slug, group);
  }

  return [...groups.values()].sort((left, right) =>
    left.artist.localeCompare(right.artist, locale, { numeric: true }),
  );
}
