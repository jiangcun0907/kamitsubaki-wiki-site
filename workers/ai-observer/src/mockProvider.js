import { createEncodedStream } from './stream.js';

const MOCK_SOURCE = {
  title: 'KAMITSUBAKI STUDIO Fan Wiki',
  url: '/',
  sourceType: 'local',
  trustTier: 'high',
};

const wait = (duration) => {
  if (typeof scheduler !== 'undefined' && typeof scheduler.wait === 'function') {
    return scheduler.wait(duration);
  }

  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
};

function buildMockAnswer(message, locale) {
  if (locale === 'ja') {
    return `KAMITSUBAKI STUDIOは、音楽・物語・バーチャル表現を横断する創作レーベルです。「${message}」については、まず公式情報とこのWikiの関連項目を照合して観測すると理解しやすいです。`;
  }

  if (locale === 'en') {
    return `KAMITSUBAKI STUDIO is a creative label crossing music, story worlds, and virtual performance. For "${message}", start from official context and then compare related wiki entries.`;
  }

  return `KAMITSUBAKI STUDIO 是一个以音乐、故事和虚拟表达交织而成的创作厂牌。关于“${message}”，我会建议先从官方信息和本站 Wiki 条目建立脉络，再继续延伸到艺人、企划和作品之间的关系。`;
}

export function createMockObserverStream({ message, locale = 'zh' }) {
  const answer = buildMockAnswer(message, locale);
  const chunks = answer.match(/.{1,18}/gu) ?? [answer];

  return createEncodedStream(async (emit) => {
    emit('status', { label: '检索站内档案' });
    emit('source', MOCK_SOURCE);
    emit('status', { label: '整理观测记录' });

    for (const chunk of chunks) {
      emit('delta', { text: chunk });
      await wait(20);
    }

    emit('done', { finishReason: 'complete' });
  });
}
