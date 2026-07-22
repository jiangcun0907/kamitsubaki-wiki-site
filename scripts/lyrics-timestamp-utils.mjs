const LRC_LINE_PATTERN = /^((?:\[\d{1,3}:\d{2}[.:]\d{1,3}\])+)[ \t]*(.*)$/u;
const LRC_TIME_PATTERN = /\[(\d{1,3}):(\d{2})[.:](\d{1,3})\]/gu;

export function stripFeatSuffix(value) {
  const source = String(value || '').trim();
  if (!source) return source;

  const withoutBracketedFeat = source.replace(
    /\s*[\[(（【]\s*(?:feat(?:uring)?\.?|ft\.?)\s*[^\])）】]+[\])）】]\s*$/iu,
    '',
  ).trim();
  if (withoutBracketedFeat !== source) return withoutBracketedFeat || source;

  const withoutPlainFeat = source.replace(
    /\s+(?:feat(?:uring)?\.?|ft\.?)\s*.+$/iu,
    '',
  ).trim();
  return withoutPlainFeat || source;
}

export function normalizeMatchText(value) {
  return String(value || '')
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .replace(/[\p{P}\p{S}\s]+/gu, '');
}

export function stringSimilarity(left, right) {
  const a = normalizeMatchText(left);
  const b = normalizeMatchText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return 0.86 + 0.14 * (Math.min(a.length, b.length) / Math.max(a.length, b.length));
  }

  const pairs = (value) => {
    if (value.length === 1) return new Map([[value, 1]]);
    const counts = new Map();
    for (let index = 0; index < value.length - 1; index += 1) {
      const pair = value.slice(index, index + 2);
      counts.set(pair, (counts.get(pair) || 0) + 1);
    }
    return counts;
  };

  const aPairs = pairs(a);
  const bPairs = pairs(b);
  let shared = 0;
  for (const [pair, count] of aPairs) {
    shared += Math.min(count, bPairs.get(pair) || 0);
  }
  const aTotal = [...aPairs.values()].reduce((sum, count) => sum + count, 0);
  const bTotal = [...bPairs.values()].reduce((sum, count) => sum + count, 0);
  return (2 * shared) / (aTotal + bTotal);
}

export function buildSearchVariants(titles, artists) {
  const titleList = [...new Set((Array.isArray(titles) ? titles : [titles]).filter(Boolean))];
  const artistList = [...new Set((Array.isArray(artists) ? artists : [artists]).filter(Boolean))];
  const variants = [];
  const seen = new Set();

  const add = (title, artist, featFallback) => {
    const key = `${normalizeMatchText(title)}\0${normalizeMatchText(artist)}`;
    if (!normalizeMatchText(title) || !normalizeMatchText(artist) || seen.has(key)) return;
    seen.add(key);
    variants.push({ title, artist, featFallback });
  };

  for (const title of titleList) {
    for (const artist of artistList) add(title, artist, false);
  }
  for (const title of titleList) {
    const stripped = stripFeatSuffix(title);
    if (stripped === title) continue;
    for (const artist of artistList) add(stripped, artist, true);
  }
  return variants;
}

export function scoreTrackCandidate(candidate, target) {
  const titleScore = stringSimilarity(candidate.title, target.title);
  const artistScore = stringSimilarity(candidate.artist, target.artist);
  const targetDuration = Number(target.duration) || 0;
  const candidateDuration = Number(candidate.duration) || 0;
  const durationDifference = targetDuration > 0 && candidateDuration > 0
    ? Math.abs(targetDuration - candidateDuration)
    : null;
  const durationTolerance = targetDuration > 0 ? Math.max(12, targetDuration * 0.08) : null;
  const durationScore = durationDifference === null
    ? 0.5
    : Math.max(0, 1 - durationDifference / Math.max(1, durationTolerance));
  const accepted = titleScore >= 0.82
    && artistScore >= 0.48
    && (durationDifference === null || durationDifference <= durationTolerance);

  return {
    accepted,
    score: 0.64 * titleScore + 0.26 * artistScore + 0.1 * durationScore,
    titleScore,
    artistScore,
    durationDifference,
  };
}

export function rankTrackCandidates(candidates, target) {
  return candidates
    .map((candidate) => ({ candidate, match: scoreTrackCandidate(candidate, target) }))
    .filter(({ match }) => match.accepted)
    .sort((left, right) => right.match.score - left.match.score);
}

export function decodeNumericEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/gu, (_match, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([\da-f]+);/giu, (_match, hexadecimal) => String.fromCodePoint(Number.parseInt(hexadecimal, 16)))
    .replaceAll('&amp;', '&');
}

export function parseLrc(lrcText) {
  const rows = [];
  for (const rawLine of decodeNumericEntities(lrcText).split(/\r?\n/u)) {
    const match = rawLine.match(LRC_LINE_PATTERN);
    if (!match) continue;
    const text = match[2].trim();
    if (!text) continue;

    LRC_TIME_PATTERN.lastIndex = 0;
    let timeMatch;
    while ((timeMatch = LRC_TIME_PATTERN.exec(match[1]))) {
      const minutes = timeMatch[1].padStart(2, '0');
      const seconds = timeMatch[2];
      const fraction = timeMatch[3].length === 1 ? `${timeMatch[3]}0` : timeMatch[3];
      rows.push({ time: `${minutes}:${seconds}.${fraction}`, text });
    }
  }
  return rows.sort((left, right) => lrcTimeToSeconds(left.time) - lrcTimeToSeconds(right.time));
}

export function lrcTimeToSeconds(value) {
  const match = String(value || '').match(/^(\d{1,3}):(\d{2})\.(\d{1,3})$/u);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]) + Number(`0.${match[3]}`);
}

export function extractLocalLyricLines(content) {
  const rows = [];
  const pattern = /<div class="jp-lyric">\r?\n?([\s\S]*?)\r?\n?<\/div>/gu;
  let match;
  while ((match = pattern.exec(String(content || '')))) {
    const text = match[1]
      .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/gu, '')
      .replace(/<rt[^>]*>[\s\S]*?<\/rt>/gu, '')
      .replace(/<[^>]+>/gu, '')
      .replace(/\s+/gu, ' ')
      .trim();
    if (text) rows.push(text);
  }
  return rows;
}

export function alignLyrics(localLines, lrcRows, threshold = 0.6) {
  const usableLocalLines = localLines
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => normalizeMatchText(text));
  const matches = new Map();
  let lrcCursor = 0;
  let scoreTotal = 0;

  for (const local of usableLocalLines) {
    let bestIndex = -1;
    let bestScore = 0;
    for (let index = lrcCursor; index < lrcRows.length; index += 1) {
      const score = stringSimilarity(local.text, lrcRows[index].text);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
      if (score === 1) break;
    }
    if (bestIndex < 0 || bestScore < threshold) continue;
    matches.set(local.index, { ...lrcRows[bestIndex], score: bestScore, lrcIndex: bestIndex });
    scoreTotal += bestScore;
    lrcCursor = bestIndex + 1;
  }

  const matched = matches.size;
  const total = usableLocalLines.length;
  return {
    matches,
    matched,
    total,
    coverage: total > 0 ? matched / total : 0,
    meanScore: matched > 0 ? scoreTotal / matched : 0,
  };
}

export function isReliableAlignment(alignment) {
  const minimumMatches = Math.min(4, alignment.total);
  return alignment.total > 0
    && alignment.matched >= minimumMatches
    && alignment.coverage >= 0.55
    && alignment.meanScore >= 0.72;
}
