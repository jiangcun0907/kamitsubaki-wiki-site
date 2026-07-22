import assert from 'node:assert/strict';

const placeholderAssetPattern =
  /https?:\/\/(?:www\.)?placehold(?:er)?\.(?:co|com)(?:\/|\b)|^\s*(?:image|cover|artwork|thumbnail)\s*:\s*["']?[^"'\n]*\bplaceholder\b[^"'\n]*["']?\s*$/im;
const standalonePlaceholderPattern =
  /^\s*(?:[^:\n]+:\s*)?["']?(?:placeholder(?:\s+(?:text|content|copy|prose))?|待补(?:充)?|未定|TBD)["']?\s*$/im;

export function assertNoPlaceholderContent(source, { forbidRawIframe = false } = {}) {
  if (forbidRawIframe) assert.doesNotMatch(source, /<iframe\b/i);
  assert.doesNotMatch(source, placeholderAssetPattern);
  assert.doesNotMatch(source, standalonePlaceholderPattern);
}
