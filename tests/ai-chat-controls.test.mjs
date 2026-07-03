import assert from 'node:assert/strict';
import test from 'node:test';

import { readModelSettings, setSegmentedValue } from '../src/lib/aiChatControls.mjs';

function fakeButton(dataset = {}) {
  const attributes = {};
  return {
    dataset,
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) {
          this.values.add(name);
        } else {
          this.values.delete(name);
        }
      },
      contains(name) {
        return this.values.has(name);
      },
    },
    setAttribute(name, value) {
      attributes[name] = value;
    },
    getAttribute(name) {
      return attributes[name];
    },
  };
}

function fakeGroup(buttons, value = 'auto') {
  return {
    dataset: { value },
    querySelectorAll(selector) {
      assert.equal(selector, 'button[role="radio"]');
      return buttons;
    },
  };
}

test('setSegmentedValue activates model and thinking radio buttons by data value', () => {
  const modelAuto = fakeButton({ aiModelOption: 'auto' });
  const modelDeep = fakeButton({ aiModelOption: 'deep' });
  const thinkingAuto = fakeButton({ aiThinkingOption: 'auto' });
  const thinkingLight = fakeButton({ aiThinkingOption: 'light' });

  const modelGroup = fakeGroup([modelAuto, modelDeep]);
  const thinkingGroup = fakeGroup([thinkingAuto, thinkingLight]);

  setSegmentedValue(modelGroup, 'deep');
  setSegmentedValue(thinkingGroup, 'light');

  assert.equal(modelGroup.dataset.value, 'deep');
  assert.equal(modelAuto.classList.contains('is-active'), false);
  assert.equal(modelAuto.getAttribute('aria-checked'), 'false');
  assert.equal(modelDeep.classList.contains('is-active'), true);
  assert.equal(modelDeep.getAttribute('aria-checked'), 'true');
  assert.equal(thinkingGroup.dataset.value, 'light');
  assert.equal(thinkingAuto.classList.contains('is-active'), false);
  assert.equal(thinkingLight.classList.contains('is-active'), true);
});

test('readModelSettings returns selected model and thinking mode with defaults', () => {
  const root = {
    querySelector(selector) {
      if (selector === '[data-ai-model-choice]') {
        return { dataset: { value: 'balanced' } };
      }
      if (selector === '[data-ai-thinking-mode]') {
        return { dataset: { value: 'deep' } };
      }
      return null;
    },
  };

  assert.deepEqual(readModelSettings(root), {
    modelChoice: 'balanced',
    thinkingMode: 'deep',
  });

  assert.deepEqual(readModelSettings({ querySelector: () => null }), {
    modelChoice: 'auto',
    thinkingMode: 'auto',
  });
});
