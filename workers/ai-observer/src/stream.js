export function encodeStreamEvent(type, data = {}) {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createEncodedStream(writeEvents) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const emit = (type, data) => {
        controller.enqueue(encoder.encode(encodeStreamEvent(type, data)));
      };

      try {
        await writeEvents(emit);
      } catch (error) {
        emit('error', {
          message: '观测线路暂时不稳定，请稍后再试。',
          code: 'stream_error',
        });
      } finally {
        controller.close();
      }
    },
  });
}

export function streamResponse(stream) {
  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
