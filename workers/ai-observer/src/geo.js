const CHINA_REGION_BY_CODE = new Map([
  ['AH', '安徽'],
  ['BJ', '北京'],
  ['CQ', '重庆'],
  ['FJ', '福建'],
  ['GD', '广东'],
  ['GS', '甘肃'],
  ['GX', '广西'],
  ['GZ', '贵州'],
  ['HA', '河南'],
  ['HB', '湖北'],
  ['HE', '河北'],
  ['HI', '海南'],
  ['HK', '香港'],
  ['HL', '黑龙江'],
  ['HN', '湖南'],
  ['JL', '吉林'],
  ['JS', '江苏'],
  ['JX', '江西'],
  ['LN', '辽宁'],
  ['MO', '澳门'],
  ['NM', '内蒙古'],
  ['NX', '宁夏'],
  ['QH', '青海'],
  ['SC', '四川'],
  ['SD', '山东'],
  ['SH', '上海'],
  ['SN', '陕西'],
  ['SX', '山西'],
  ['TJ', '天津'],
  ['TW', '台湾'],
  ['XJ', '新疆'],
  ['XZ', '西藏'],
  ['YN', '云南'],
  ['ZJ', '浙江'],
]);

const CHINA_PROVINCE_LEVEL_NAMES = new Set(CHINA_REGION_BY_CODE.values());

const CHINA_REGION_CODE_BY_ENGLISH_NAME = new Map([
  ['anhui', 'AH'],
  ['beijing', 'BJ'],
  ['chongqing', 'CQ'],
  ['fujian', 'FJ'],
  ['gansu', 'GS'],
  ['guangdong', 'GD'],
  ['guangxi', 'GX'],
  ['guizhou', 'GZ'],
  ['hainan', 'HI'],
  ['hebei', 'HE'],
  ['heilongjiang', 'HL'],
  ['henan', 'HA'],
  ['hong kong', 'HK'],
  ['hubei', 'HB'],
  ['hunan', 'HN'],
  ['inner mongolia', 'NM'],
  ['jiangsu', 'JS'],
  ['jiangxi', 'JX'],
  ['jilin', 'JL'],
  ['liaoning', 'LN'],
  ['macao', 'MO'],
  ['macau', 'MO'],
  ['ningxia', 'NX'],
  ['qinghai', 'QH'],
  ['shaanxi', 'SN'],
  ['shandong', 'SD'],
  ['shanghai', 'SH'],
  ['shanxi', 'SX'],
  ['sichuan', 'SC'],
  ['taiwan', 'TW'],
  ['tianjin', 'TJ'],
  ['tibet', 'XZ'],
  ['xinjiang', 'XJ'],
  ['xizang', 'XZ'],
  ['yunnan', 'YN'],
  ['zhejiang', 'ZJ'],
]);

function normalizeEnglishRegionKey(region) {
  return region
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(?:zhuang|hui|uyghur|uighur|weiwuer)\s+autonomous\s+region\b/g, '')
    .replace(/\bspecial\s+administrative\s+region\b/g, '')
    .replace(/\b(?:autonomous\s+region|province|municipality)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeChinaRegion(cf = {}) {
  if (cf.country !== 'CN') {
    return '';
  }

  const regionCode = typeof cf.regionCode === 'string' ? cf.regionCode.toUpperCase() : '';
  if (CHINA_REGION_BY_CODE.has(regionCode)) {
    return CHINA_REGION_BY_CODE.get(regionCode);
  }

  const region = typeof cf.region === 'string' ? cf.region.trim() : '';
  if (!region) {
    return '';
  }

  if (/[\u3400-\u9fff]/.test(region)) {
    const normalizedRegion = region
      .replace(/省$/, '')
      .replace(/市$/, '')
      .replace(/壮族自治区$/, '')
      .replace(/回族自治区$/, '')
      .replace(/维吾尔自治区$/, '')
      .replace(/自治区$/, '')
      .replace(/特别行政区$/, '');

    return CHINA_PROVINCE_LEVEL_NAMES.has(normalizedRegion) ? normalizedRegion : '';
  }

  const matchedCode = CHINA_REGION_CODE_BY_ENGLISH_NAME.get(normalizeEnglishRegionKey(region));
  return matchedCode ? CHINA_REGION_BY_CODE.get(matchedCode) : '';
}

export function buildObserverGreeting({ cf = {}, displayName = '' } = {}) {
  if (displayName) {
    return `欢迎回来，${displayName}。新的观测线索已经准备好。`;
  }

  if (cf.country === 'CN') {
    const region = normalizeChinaRegion(cf);
    return region ? `来自${region}的观测者，欢迎回来。` : '来自中国的观测者，欢迎回来。';
  }

  return '远方的观测者，欢迎回来。';
}
