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

function buildSourceSummary(sources, locale) {
  const sourceNames = sources
    .slice(0, 3)
    .map((source) => source.title)
    .join('、');

  if (!sourceNames) {
    return '';
  }

  if (locale === 'ja') {
    return ` 参考源：${sourceNames}。`;
  }

  if (locale === 'en') {
    return ` Sources checked: ${sourceNames}.`;
  }

  return `本次参考源：${sourceNames}。`;
}

function buildMockAnswer(message, locale, sources) {
  const sourceSummary = buildSourceSummary(sources, locale);

  if (locale === 'ja') {
    return `KAMITSUBAKI STUDIOは、音楽・物語・バーチャル表現を横断する創作レーベルです。「${message}」については、まず公式情報とこのWikiの関連項目を照合して観測すると理解しやすいです。${sourceSummary}`;
  }

  if (locale === 'en') {
    return `KAMITSUBAKI STUDIO is a creative label crossing music, story worlds, and virtual performance. For "${message}", start from official context and then compare related wiki entries. ${sourceSummary}`;
  }

  return `KAMITSUBAKI STUDIO 是一个以音乐、故事和虚拟表达交织而成的创作厂牌。关于“${message}”，我会建议先从官方信息和本站 Wiki 条目建立脉络，再继续延伸到艺人、企划和作品之间的关系。${sourceSummary}`;
}

export function createMockObserverStream({ message, locale = 'zh', sources = [MOCK_SOURCE] }) {
  const answer = buildMockAnswer(message, locale, sources);
  const chunks = answer.match(/.{1,18}/gu) ?? [answer];

  return createEncodedStream(async (emit) => {
    emit('status', { label: '检索公开资料' });
    for (const source of sources) {
      emit('source', source);
    }
    emit('status', { label: '整理观测记录' });

    for (const chunk of chunks) {
      emit('delta', { text: chunk });
      await wait(20);
    }

    emit('done', { finishReason: 'complete' });
  });
}
