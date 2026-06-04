export function sortByOrder(entries) {
  return [...entries].sort((a, b) => a.data.order - b.data.order);
}

export function getLocalizedEntries(entries, locale, fallbackLocale = 'zh') {
  const localized = new Map();
  const fallback = new Map();

  for (const entry of entries) {
    if (entry.data.locale === locale) {
      localized.set(entry.data.translationKey, entry);
    }

    if (entry.data.locale === fallbackLocale) {
      fallback.set(entry.data.translationKey, entry);
    }
  }

  return [...new Set([...fallback.keys(), ...localized.keys()])].map(
    (key) => localized.get(key) ?? fallback.get(key),
  );
}

export function getLocalizedSite(siteEntries, locale, fallbackLocale = 'zh') {
  return (
    siteEntries.find((entry) => entry.data.locale === locale)?.data ??
    siteEntries.find((entry) => entry.data.locale === fallbackLocale)?.data
  );
}

export function buildArtistCategories(artistEntries) {
  const categories = new Map();

  for (const entry of artistEntries) {
    const artist = entry.data;

    if (!categories.has(artist.categoryId)) {
      categories.set(artist.categoryId, {
        id: artist.categoryId,
        title: artist.categoryTitle,
        subtitle: artist.categorySubtitle,
        order: artist.categoryOrder,
        items: [],
      });
    }

    const item = {
      id: entry.id.split('/').slice(0, -1).join('/'),
      code: artist.code,
      name: artist.name,
      romanizedName: artist.romanizedName,
      meta: artist.meta,
      statusLabel: artist.statusLabel,
      status: artist.status,
      image: artist.image,
      order: artist.itemOrder,
    };

    if (artist.inactive !== undefined) {
      item.inactive = artist.inactive;
    }

    categories.get(artist.categoryId).items.push(item);
  }

  return [...categories.values()]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.subtitle,
      items: category.items
        .sort((a, b) => a.order - b.order)
        .map(({ order, ...artist }) => artist),
    }));
}
