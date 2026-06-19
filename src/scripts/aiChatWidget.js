import { parseAiStreamChunk } from '../lib/aiStream.mjs';

const widgets = document.querySelectorAll('[data-ai-chat]');
let turnstileLoader;

function createMessage(role, text = '') {
  const message = document.createElement('article');
  message.className = `ai-message ai-message--${role}`;

  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  message.append(paragraph);

  return { message, paragraph };
}

function createThinkingMessage() {
  const { message } = createMessage('assistant');
  message.classList.add('ai-message--thinking');
  message.innerHTML = '<span></span><span></span><span></span>';
  return message;
}

function appendSource(paragraph, source) {
  if (!source?.title || !source?.url) {
    return;
  }

  const message = paragraph.closest('.ai-message');
  if (!message) {
    return;
  }

  let sources = message.querySelector('.ai-message__sources');
  if (!sources) {
    sources = document.createElement('div');
    sources.className = 'ai-message__sources';
    message.append(sources);
  }

  const link = document.createElement('a');
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = source.title;
  sources.append(link);
}

function scrollMessages(messages) {
  messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
}

function setExpanded(root, expanded) {
  root.classList.toggle('is-open', expanded);
  root.querySelector('[data-ai-panel]')?.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  root.querySelector('[data-ai-toggle]')?.setAttribute('aria-expanded', String(expanded));
}

function setThinking(root, copy, thinking) {
  root.classList.toggle('is-thinking', thinking);
  const bubble = root.querySelector('[data-ai-bubble]');
  if (bubble) {
    bubble.textContent = thinking ? copy.bubbleThinking : copy.bubbleIdle;
  }
}

function normalizeCopy(root) {
  try {
    return JSON.parse(root.dataset.copy || '{}');
  } catch {
    return {};
  }
}

function updateCustomModelVisibility(root) {
  const modelChoice = root.querySelector('[data-ai-model-choice]');
  const customModelWrap = root.querySelector('[data-ai-custom-model-wrap]');
  if (!(modelChoice instanceof HTMLSelectElement) || !(customModelWrap instanceof HTMLElement)) {
    return;
  }

  customModelWrap.hidden = modelChoice.value !== 'custom';
}

function readModelSettings(root) {
  const modelChoice = root.querySelector('[data-ai-model-choice]');
  const customModel = root.querySelector('[data-ai-custom-model]');
  const thinkingMode = root.querySelector('[data-ai-thinking-mode]');

  return {
    modelChoice: modelChoice instanceof HTMLSelectElement ? modelChoice.value : 'auto',
    customModel: customModel instanceof HTMLInputElement ? customModel.value.trim() : '',
    thinkingMode: thinkingMode instanceof HTMLSelectElement ? thinkingMode.value : 'auto',
  };
}

function updateAuthState(root, copy, viewer) {
  const status = root.querySelector('[data-ai-auth-status]');
  const logout = root.querySelector('[data-ai-logout]');
  const oauthButtons = root.querySelectorAll('[data-ai-oauth]');
  const note = root.querySelector('[data-ai-auth-note]');
  const isUser = viewer?.kind === 'user';

  root.dataset.viewerKind = isUser ? 'user' : 'anonymous';

  if (status) {
    status.textContent = isUser
      ? `${copy.accountLoggedInPrefix || ''} ${viewer.displayName || viewer.email || ''}`.trim()
      : copy.accountAnonymous || '';
  }

  oauthButtons.forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      button.hidden = isUser;
    }
  });

  if (logout instanceof HTMLButtonElement) {
    logout.hidden = !isUser;
  }

  if (note instanceof HTMLElement) {
    note.hidden = true;
    note.textContent = '';
  }
}

async function bootstrap(root) {
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase) {
    return;
  }

  const response = await fetch(`${apiBase}/api/ai/bootstrap`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return;
  }

  const data = await response.json();
  const copy = normalizeCopy(root);
  updateAuthState(root, copy, data.viewer);

  if (typeof data.greeting === 'string' && data.greeting) {
    const firstAssistantMessage = root.querySelector('.ai-message--assistant p');
    if (firstAssistantMessage) {
      firstAssistantMessage.textContent = data.greeting;
    }
  }

  if (data.turnstile?.siteKey) {
    root.dataset.turnstileSiteKey = data.turnstile.siteKey;
  }
}

function loadTurnstile() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileLoader) {
    return turnstileLoader;
  }

  turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable.')));
    script.onerror = () => reject(new Error('Turnstile failed to load.'));
    document.head.append(script);
  });

  return turnstileLoader;
}

async function requestTurnstileToken(root, paragraph, copy) {
  const siteKey = root.dataset.turnstileSiteKey || '';
  if (!siteKey) {
    return '';
  }

  try {
    const turnstile = await loadTurnstile();
    const container = document.createElement('div');
    container.className = 'ai-message__challenge';
    paragraph.after(container);

    return await new Promise((resolve) => {
      turnstile.render(container, {
        sitekey: siteKey,
        callback(token) {
          root.dataset.turnstileToken = token;
          paragraph.textContent = copy.challengeReady || paragraph.textContent;
          resolve(token);
        },
        'error-callback'() {
          resolve('');
        },
        'expired-callback'() {
          delete root.dataset.turnstileToken;
        },
      });
    });
  } catch {
    return '';
  }
}

function startOAuth(root, provider) {
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase || !['github', 'google'].includes(provider)) {
    return;
  }

  const returnTo = window.location.href;
  const url = new URL(apiBase + '/api/auth/oauth/' + provider + '/start');
  url.searchParams.set('returnTo', returnTo);
  window.location.assign(url.toString());
}

async function logout(root, copy) {
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase) {
    return;
  }

  try {
    await fetch(`${apiBase}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } finally {
    updateAuthState(root, copy, { kind: 'anonymous' });
  }
}

async function readStream(response, paragraph, thinkingMessage, messages, copy, root) {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/event-stream')) {
    throw new Error('AI observer response is not an event stream.');
  }

  if (!response.body) {
    paragraph.textContent = paragraph.dataset.emptyResponse || '';
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let remainder = '';
  let hasDelta = false;
  let needsChallenge = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    const parsed = parseAiStreamChunk(decoder.decode(value, { stream: true }), remainder);
    remainder = parsed.remainder;

    for (const event of parsed.events) {
      if (event.type === 'delta' && typeof event.data.text === 'string') {
        if (!hasDelta) {
          thinkingMessage.remove();
          paragraph.textContent = '';
          hasDelta = true;
        }
        paragraph.textContent += event.data.text;
        scrollMessages(messages);
      }

      if (event.type === 'challenge_required') {
        thinkingMessage.remove();
        paragraph.textContent = event.data.message || copy.challengeFallback || '';
        needsChallenge = true;
      }

      if (event.type === 'login_required') {
        thinkingMessage.remove();
        paragraph.textContent = event.data.message || copy.loginRequiredFallback || copy.authErrorFallback || '';
      }

      if (event.type === 'source') {
        appendSource(paragraph, event.data);
      }

      if (event.type === 'error') {
        thinkingMessage.remove();
        paragraph.textContent = event.data.message || copy.streamErrorFallback || '';
      }
    }
  }

  if (!hasDelta && !paragraph.textContent) {
    thinkingMessage.remove();
    paragraph.textContent = paragraph.dataset.emptyResponse || '';
  }

  if (needsChallenge && root) {
    await requestTurnstileToken(root, paragraph, copy);
  }
}

function initWidget(root) {
  const copy = normalizeCopy(root);
  const toggle = root.querySelector('[data-ai-toggle]');
  const close = root.querySelector('[data-ai-close]');
  const minimize = root.querySelector('[data-ai-minimize]');
  const form = root.querySelector('[data-ai-form]');
  const input = root.querySelector('[data-ai-input]');
  const messages = root.querySelector('[data-ai-messages]');
  const quick = root.querySelector('[data-ai-quick]');
  const modelChoice = root.querySelector('[data-ai-model-choice]');
  const oauthButtons = root.querySelectorAll('[data-ai-oauth]');
  const logoutButton = root.querySelector('[data-ai-logout]');

  if (!toggle || !close || !minimize || !form || !input || !messages || !quick) {
    return;
  }

  updateCustomModelVisibility(root);
  updateAuthState(root, copy, { kind: 'anonymous' });
  bootstrap(root).catch(() => {});

  toggle.addEventListener('click', () => {
    setExpanded(root, !root.classList.contains('is-open'));
    if (root.classList.contains('is-open')) {
      window.setTimeout(() => input.focus(), 120);
    }
  });

  close.addEventListener('click', () => setExpanded(root, false));
  minimize.addEventListener('click', () => setExpanded(root, false));

  quick.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    input.value = target.dataset.aiPrompt || '';
    input.focus();
  });

  if (modelChoice) {
    modelChoice.addEventListener('change', () => updateCustomModelVisibility(root));
  }

  oauthButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button instanceof HTMLButtonElement) {
        startOAuth(root, button.dataset.aiOauth || '');
      }
    });
  });

  if (logoutButton instanceof HTMLButtonElement) {
    logoutButton.addEventListener('click', () => logout(root, copy).catch(() => {}));
  }

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = input.value.trim();
    if (!message || root.classList.contains('is-thinking')) {
      return;
    }

    const apiBase = root.dataset.apiBase || '';
    const locale = root.dataset.locale || document.documentElement.lang || 'zh';
    const turnstileToken = root.dataset.turnstileToken || '';
    const userMessage = createMessage('user', message);
    messages.append(userMessage.message);
    input.value = '';
    input.style.height = 'auto';

    const thinkingMessage = createThinkingMessage();
    const assistantMessage = createMessage('assistant', '');
    assistantMessage.paragraph.dataset.emptyResponse = copy.emptyResponse || '';
    messages.append(thinkingMessage, assistantMessage.message);
    scrollMessages(messages);
    setThinking(root, copy, true);

    try {
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message, locale, turnstileToken, ...readModelSettings(root) }),
      });
      delete root.dataset.turnstileToken;

      await readStream(response, assistantMessage.paragraph, thinkingMessage, messages, copy, root);
    } catch {
      thinkingMessage.remove();
      assistantMessage.paragraph.textContent = copy.fallbackOffline || '';
    } finally {
      setThinking(root, copy, false);
      scrollMessages(messages);
    }
  });
}

widgets.forEach(initWidget);
