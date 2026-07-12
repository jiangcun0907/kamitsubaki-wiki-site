export function createGithubIdentityResolver({ token = '', repository = '', fetchImpl = fetch } = {}) {
  const cache = new Map();
  const enabled = Boolean(token && /^[^/]+\/[^/]+$/.test(repository));

  return async function resolveGithubIdentity(commitSha, fallbackAuthor) {
    if (!enabled || !commitSha) return fallbackAuthor;
    if (cache.has(commitSha)) return cache.get(commitSha);

    const pending = (async () => {
      try {
        const headers = {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'kamitsubaki-wiki-contributor-sync',
        };
        const response = await fetchImpl(
          `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(commitSha)}`,
          { headers },
        );
        if (!response.ok) return fallbackAuthor;
        const body = await response.json();
        let author = body?.author;
        if (!author?.login) {
          const pullsResponse = await fetchImpl(
            `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(commitSha)}/pulls`,
            { headers },
          );
          if (pullsResponse.ok) {
            const pulls = await pullsResponse.json();
            author = Array.isArray(pulls) ? pulls[0]?.user : null;
          }
        }
        if (!author?.login) return fallbackAuthor;
        const loginKey = String(author.login).toLowerCase();
        return {
          contributor: {
            id: `github:${loginKey}`,
            displayName: fallbackAuthor?.contributor?.displayName || author.login,
            githubLogin: author.login,
            avatarUrl: author.avatar_url || `https://github.com/${author.login}.png?size=96`,
            profileUrl: author.html_url || `https://github.com/${author.login}`,
            isBot: /\[bot\]$/i.test(author.login),
          },
          identity: { provider: 'github', providerKey: loginKey },
        };
      } catch {
        return fallbackAuthor;
      }
    })();

    cache.set(commitSha, pending);
    return pending;
  };
}
