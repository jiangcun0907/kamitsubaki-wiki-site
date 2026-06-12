import { parseAiStreamChunk } from '../lib/aiStream.mjs';

const widgets = document.querySelectorAll('[data-ai-chat]');

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
  if (typeof data.greeting !== 'string' || !data.greeting) {
    return;
  }

  const firstAssistantMessage = root.querySelector('.ai-message--assistant p');
  if (firstAssistantMessage) {
    firstAssistantMessage.textContent = data.greeting;
  }

  if (data.turnstile?.siteKey) {
    root.dataset.turnstileSiteKey = data.turnstile.siteKey;
  }
}

async function readStream(response, paragraph, thinkingMessage, messages, copy) {
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

  if (!toggle || !close || !minimize || !form || !input || !messages || !quick) {
    return;
  }

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
        body: JSON.stringify({ message, locale }),
      });

      await readStream(response, assistantMessage.paragraph, thinkingMessage, messages, copy);
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
