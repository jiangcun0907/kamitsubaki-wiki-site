export function setSegmentedValue(group, value) {
  if (!group || !group.dataset || typeof group.querySelectorAll !== 'function') {
    return;
  }

  group.dataset.value = value;
  group.querySelectorAll('button[role="radio"]').forEach((button) => {
    if (!button?.dataset || !button.classList || typeof button.setAttribute !== 'function') {
      return;
    }
    const isActive = button.dataset.aiModelOption === value || button.dataset.aiThinkingOption === value;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-checked', String(isActive));
  });
}

export function readModelSettings(root) {
  const modelChoice = typeof root?.querySelector === 'function' ? root.querySelector('[data-ai-model-choice]') : null;
  const thinkingMode = typeof root?.querySelector === 'function' ? root.querySelector('[data-ai-thinking-mode]') : null;

  return {
    modelChoice: modelChoice?.dataset?.value || 'auto',
    thinkingMode: thinkingMode?.dataset?.value || 'auto',
  };
}
