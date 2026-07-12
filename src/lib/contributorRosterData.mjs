function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function contributorKey(contributor = {}) {
  return contributor.id || contributor.githubLogin || contributor.displayName || 'unknown';
}

function commitKey(event, index) {
  return event.commitSha || event.commitUrl || `event:${index}`;
}

function sortLocales(locales) {
  return unique(locales).sort((left, right) => left.localeCompare(right));
}

function normalizeRecent(recent) {
  const groups = new Map();

  recent.forEach((event, index) => {
    const key = commitKey(event, index);
    const existing = groups.get(key);
    const entryIds = event.entryIds || [event.entryId || event.path];
    const locales = event.locales || [event.locale];

    if (existing) {
      existing.entryIds = unique([...existing.entryIds, ...entryIds]);
      existing.locales = sortLocales([...existing.locales, ...locales]);
      return;
    }

    groups.set(key, {
      ...event,
      entryIds: unique(entryIds),
      locales: sortLocales(locales),
    });
  });

  return [...groups.values()].sort((left, right) => {
    return new Date(right.committedAt || 0).getTime() - new Date(left.committedAt || 0).getTime();
  });
}

function normalizeContributors(contributors, recent) {
  const visible = contributors.filter((contributor) => !contributor.isBot);
  const rawRecentCounts = new Map();
  const uniqueRecentCommits = new Map();

  for (const event of recent.raw) {
    const key = contributorKey(event.contributor);
    rawRecentCounts.set(key, (rawRecentCounts.get(key) || 0) + 1);
  }
  for (const event of recent.normalized) {
    const key = contributorKey(event.contributor);
    uniqueRecentCommits.set(key, (uniqueRecentCommits.get(key) || 0) + 1);
  }

  return visible.map((contributor, index) => {
    const key = contributorKey(contributor);
    const reported = Number(contributor.contributionCount || 0);
    const rawVisible = rawRecentCounts.get(key) || 0;
    const contributionCount = reported > 0 && reported <= rawVisible
      ? uniqueRecentCommits.get(key) || reported
      : reported;

    return { ...contributor, contributionCount, rank: index + 1 };
  });
}

export function normalizeContributorData(data = {}, { mode = 'summary', recentLimit } = {}) {
  const rawRecent = Array.isArray(data.recent) ? data.recent : [];
  const normalizedRecent = normalizeRecent(rawRecent);
  const topContributors = normalizeContributors(
    Array.isArray(data.topContributors) ? data.topContributors : [],
    { raw: rawRecent, normalized: normalizedRecent },
  );
  const reportedContributions = Number(data.totals?.contributions || 0);
  const contributions = reportedContributions > 0 && reportedContributions <= rawRecent.length
    ? normalizedRecent.length
    : reportedContributions || normalizedRecent.length;
  const entryIds = unique(normalizedRecent.flatMap((event) => event.entryIds));
  const limit = Number.isFinite(Number(recentLimit))
    ? Number(recentLimit)
    : mode === 'entry' ? 3 : 8;

  return {
    totals: {
      ...(data.totals || {}),
      contributors: Number(data.totals?.contributors || topContributors.length),
      contributions,
      entries: Number(data.totals?.entries || entryIds.length),
    },
    topContributors,
    recent: normalizedRecent.slice(0, Math.max(0, limit)),
  };
}
