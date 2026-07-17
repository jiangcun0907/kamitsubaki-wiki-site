import { createHash } from 'node:crypto';

const localePattern = /^(zh|ja|en)$/;

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function parseGithubLogin(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const numbered = normalized.match(/^\d+\+([^@]+)@users\.noreply\.github\.com$/);
  if (numbered) {
    return numbered[1];
  }
  const plain = normalized.match(/^([^@]+)@users\.noreply\.github\.com$/);
  return plain ? plain[1] : '';
}

export function contributorFromAuthor(name, email) {
  const displayName = String(name || 'Contributor').trim();
  const githubLogin = parseGithubLogin(email);
  if (githubLogin) {
    return {
      contributor: {
        id: `github:${githubLogin}`,
        displayName: displayName || githubLogin,
        githubLogin,
        avatarUrl: `https://github.com/${githubLogin}.png?size=96`,
        profileUrl: `https://github.com/${githubLogin}`,
        isBot: /\[bot\]$/.test(githubLogin),
      },
      identity: { provider: 'github', providerKey: githubLogin },
    };
  }

  const emailHash = email ? sha256(String(email).trim().toLowerCase()) : sha256(displayName);
  return {
    contributor: {
      id: `git:${emailHash.slice(0, 16)}`,
      displayName,
      isBot: /\[bot\]$/i.test(displayName),
    },
    identity: { provider: 'git_email', providerKey: emailHash, emailHash },
  };
}

export function parseContentPath(path) {
  const parts = path.split('/');
  if (parts[0] !== 'src' || parts[1] !== 'content') {
    return null;
  }

  if (parts[2] === 'site') {
    const filename = parts[3] || '';
    const locale = filename.replace(/\.(json|md)$/, '');
    return localePattern.test(locale) ? { collection: 'site', entryId: 'home', locale } : null;
  }

  const collection = parts[2];
  if (!['artists', 'albums', 'songs', 'projects', 'logs', 'contribute'].includes(collection)) {
    return null;
  }

  const filename = parts.at(-1) || '';
  const match = filename.match(/^([a-z]{2})\.mdx?$/);
  if (!match || !localePattern.test(match[1])) {
    return null;
  }

  const entryId = parts.slice(3, -1).join('/');
  return entryId ? { collection, entryId, locale: match[1] } : null;
}

export function collectContributionEvents(output, commitBaseUrl) {
  const groups = new Map();
  const chunks = String(output || '').split('\x1e').filter(Boolean);

  for (const chunk of chunks) {
    const lines = chunk.trim().split(/\r?\n/).filter(Boolean);
    const [commitSha, authorName, authorEmail, committedAt, summary] = (lines.shift() || '').split('\x1f');
    if (!commitSha || !committedAt) {
      continue;
    }

    const author = contributorFromAuthor(authorName, authorEmail);
    for (const path of lines) {
      const parsed = parseContentPath(path);
      if (!parsed) {
        continue;
      }
      const key = [commitSha, author.contributor.id, parsed.collection, parsed.entryId].join('\x1f');
      const existing = groups.get(key);
      if (existing) {
        existing.paths.push(path);
        existing.locales.push(parsed.locale);
        continue;
      }
      groups.set(key, {
        collection: parsed.collection,
        entryId: parsed.entryId,
        locale: parsed.locale,
        path,
        paths: [path],
        locales: [parsed.locale],
        commitSha,
        commitUrl: `${commitBaseUrl}/${commitSha}`,
        summary,
        committedAt,
        ...author,
      });
    }
  }

  return [...groups.values()].map((event) => ({
    ...event,
    paths: [...new Set(event.paths)].sort(),
    locales: [...new Set(event.locales)].sort(),
  }));
}
