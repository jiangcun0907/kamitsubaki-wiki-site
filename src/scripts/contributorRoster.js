function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name) {
  return String(name || '?')
    .trim()
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value, locale) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale || 'zh', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function renderAvatar(contributor) {
  const name = contributor.displayName || contributor.githubLogin || 'Contributor';
  if (contributor.avatarUrl) {
    return `<img src="${escapeHtml(contributor.avatarUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
  }
  return `<span>${escapeHtml(initials(name))}</span>`;
}

function renderContributor(contributor, copy) {
  const name = contributor.displayName || contributor.githubLogin || 'Contributor';
  const body = `
    <span class="contributor-roster__avatar">${renderAvatar(contributor)}</span>
    <span class="contributor-roster__identity">
      <strong>${escapeHtml(name)}</strong>
      <small>${Number(contributor.contributionCount || 0)} ${escapeHtml(copy.contributions)}${contributor.entryCount ? ` · ${Number(contributor.entryCount)} ${escapeHtml(copy.entries)}` : ''}</small>
    </span>
  `;

  if (contributor.profileUrl) {
    return `<a class="contributor-roster__person" href="${escapeHtml(contributor.profileUrl)}" target="_blank" rel="noopener noreferrer">${body}</a>`;
  }

  return `<div class="contributor-roster__person">${body}</div>`;
}

function renderRecent(event, copy, locale) {
  const summary = event.summary || copy.unknownSummary;
  const name = event.contributor?.displayName || event.contributor?.githubLogin || 'Contributor';
  const commitLabel = event.commitSha ? event.commitSha.slice(0, 7) : copy.commit;
  const commit = event.commitUrl
    ? `<a href="${escapeHtml(event.commitUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(commitLabel)}</a>`
    : `<span>${escapeHtml(commitLabel)}</span>`;

  return `
    <li>
      <div class="contributor-roster__recent-main">
        <strong>${escapeHtml(summary)}</strong>
        <span>${escapeHtml(name)} · ${escapeHtml(formatDate(event.committedAt, locale))}</span>
      </div>
      <div class="contributor-roster__recent-meta">
        <span>${escapeHtml(event.entryId || event.path || '')}</span>
        ${commit}
      </div>
    </li>
  `;
}

function renderRoster(root, data, copy) {
  const totals = data.totals || {};
  const topContributors = data.topContributors || [];
  const recent = data.recent || [];
  const locale = root.dataset.locale || 'zh';

  if (!topContributors.length && !recent.length) {
    return `<div class="contributor-roster__empty">${escapeHtml(copy.empty)}</div>`;
  }

  return `
    <div class="contributor-roster__stats">
      <div><strong>${Number(totals.contributors || 0)}</strong><span>${escapeHtml(copy.contributors)}</span></div>
      <div><strong>${Number(totals.contributions || 0)}</strong><span>${escapeHtml(copy.contributions)}</span></div>
      ${Number.isFinite(Number(totals.entries)) ? `<div><strong>${Number(totals.entries || 0)}</strong><span>${escapeHtml(copy.entries)}</span></div>` : ''}
    </div>
    <div class="contributor-roster__grid">
      <section class="contributor-roster__section">
        <h3>${escapeHtml(copy.topTitle)}</h3>
        <div class="contributor-roster__people">
          ${topContributors.map((contributor) => renderContributor(contributor, copy)).join('')}
        </div>
      </section>
      <section class="contributor-roster__section">
        <h3>${escapeHtml(copy.recentTitle)}</h3>
        <ol class="contributor-roster__recent">
          ${recent.map((event) => renderRecent(event, copy, locale)).join('')}
        </ol>
      </section>
    </div>
  `;
}

async function loadRoster(root) {
  const status = root.dataset.contributorRosterStatus;
  if (status === 'loading' || status === 'loaded' || status === 'error') {
    return;
  }

  const apiBase = root.dataset.apiBase || '';
  const mode = root.dataset.mode || 'summary';
  const copy = JSON.parse(root.dataset.copy || '{}');
  const state = root.querySelector('[data-contributor-state]');
  const content = root.querySelector('[data-contributor-content]');
  if (!apiBase || !content) {
    return;
  }

  root.dataset.contributorRosterStatus = 'loading';

  const url = new URL(mode === 'entry' ? '/api/contributors/entry' : '/api/contributors/summary', apiBase);
  if (mode === 'entry') {
    url.searchParams.set('collection', root.dataset.collection || '');
    url.searchParams.set('entryId', root.dataset.entryId || '');
  }

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Contributor API returned ${response.status}`);
    }
    const data = await response.json();
    content.innerHTML = renderRoster(root, data, copy);
    content.hidden = false;
    state?.setAttribute('hidden', '');
    root.dataset.contributorRosterStatus = 'loaded';
  } catch {
    root.dataset.contributorRosterStatus = 'error';
    if (state) {
      state.textContent = copy.empty || 'Contribution records are waiting for sync';
    }
  }
}

function initializeContributorRosters() {
  for (const root of document.querySelectorAll('[data-contributor-roster]')) {
    loadRoster(root);
  }
}

initializeContributorRosters();
document.addEventListener('astro:page-load', initializeContributorRosters);
