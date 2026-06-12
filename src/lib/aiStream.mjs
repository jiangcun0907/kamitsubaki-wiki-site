export function parseAiStreamChunk(chunk, previousRemainder = '') {
  const input = `${previousRemainder}${chunk}`;
  const frames = input.split('\n\n');
  const remainder = frames.pop() ?? '';
  const events = [];

  for (const frame of frames) {
    const lines = frame.split('\n');
    const eventLine = lines.find((line) => line.startsWith('event: '));
    const dataLine = lines.find((line) => line.startsWith('data: '));

    if (!eventLine || !dataLine) {
      continue;
    }

    const type = eventLine.slice('event: '.length).trim();
    const rawData = dataLine.slice('data: '.length);

    try {
      events.push({ type, data: JSON.parse(rawData) });
    } catch {
      events.push({ type: 'error', data: { code: 'invalid_stream_event' } });
    }
  }

  return { events, remainder };
}
