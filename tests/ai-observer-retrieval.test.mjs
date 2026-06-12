import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildKamitsubakiSearchQuery,
  isAllowedSourceUrl,
  retrieveKamitsubakiSources,
} from '../workers/ai-observer/src/retrieval.js';

test('buildKamitsubakiSearchQuery keeps Kamitsubaki context in user queries', () => {
  assert.equal(buildKamitsubakiSearchQuery('V.W.P 是谁？'), 'V.W.P 是谁？ KAMITSUBAKI STUDIO 神椿');
  assert.equal(buildKamitsubakiSearchQuery('神椿是什么？'), '神椿是什么？');
  assert.equal(buildKamitsubakiSearchQuery(''), 'KAMITSUBAKI STUDIO 神椿');
});

test('isAllowedSourceUrl only allows trusted source domains and subdomains', () => {
  assert.equal(isAllowedSourceUrl('https://kamitsubaki.jp/news/'), true);
  assert.equal(isAllowedSourceUrl('https://kaf.kamitsubaki.jp/'), true);
  assert.equal(isAllowedSourceUrl('https://zh.wikipedia.org/wiki/神椿工作室'), true);
  assert.equal(isAllowedSourceUrl('https://zh.moegirl.org.cn/神椿'), true);
  assert.equal(isAllowedSourceUrl('https://example.com/kamitsubaki'), false);
  assert.equal(isAllowedSourceUrl('not a url'), false);
});

test('retrieveKamitsubakiSources merges official and MediaWiki search results', async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(String(url));
    return Response.json({
      query: {
        search: [
          {
            title: '神椿工作室',
            snippet: '<span>神椿</span>相关摘要',
          },
        ],
      },
    });
  };

  const sources = await retrieveKamitsubakiSources({
    message: '神椿是什么？',
    locale: 'zh',
    fetchImpl,
    limit: 5,
  });

  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[0], /zh\.wikipedia\.org/);
  assert.match(requestedUrls[1], /zh\.moegirl\.org\.cn/);
  assert.equal(sources[0].sourceType, 'official');
  assert.equal(sources.some((source) => source.title.includes('Wikipedia: 神椿工作室')), true);
  assert.equal(sources.some((source) => source.title.includes('Moegirlpedia: 神椿工作室')), true);
  assert.equal(sources.every((source) => isAllowedSourceUrl(source.url)), true);
});

test('retrieveKamitsubakiSources fails closed when search fetch fails', async () => {
  const fetchImpl = async () => {
    throw new Error('network unavailable');
  };

  const sources = await retrieveKamitsubakiSources({
    message: '花譜',
    locale: 'zh',
    fetchImpl,
    limit: 4,
  });

  assert.equal(sources.length >= 1, true);
  assert.equal(sources.every((source) => source.sourceType === 'official'), true);
});
