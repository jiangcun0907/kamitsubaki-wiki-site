import {
  siApplemusic,
  siBilibili,
  siInstagram,
  siNeteasecloudmusic,
  siNiconico,
  siPiapro,
  siPixiv,
  siSinaweibo,
  siSpotify,
  siSteam,
  siTiktok,
  siWikipedia,
  siX,
  siYoutube,
} from 'simple-icons';

const platformDefinitions = [
  { id: 'bilibili', name: 'Bilibili', color: '#00AEEC', icon: siBilibili, domains: ['bilibili.com', 'b23.tv'], labels: [/bilibili/i, /\bb站\b/i, /哔哩哔哩/i] },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: siYoutube, domains: ['youtube.com', 'youtu.be'], labels: [/youtube/i] },
  { id: 'x', name: 'X', color: '#F5F5F5', icon: siX, domains: ['x.com', 'twitter.com'], labels: [/(^|\W)x(\W|$)/i, /twitter/i, /推特/i] },
  { id: 'tiktok', name: 'TikTok', color: '#25F4EE', icon: siTiktok, domains: ['tiktok.com'], labels: [/tiktok/i, /抖音/i] },
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: siInstagram, domains: ['instagram.com'], labels: [/instagram/i] },
  { id: 'weibo', name: 'Weibo', color: '#E6162D', icon: siSinaweibo, domains: ['weibo.com'], labels: [/weibo/i, /微博/i] },
  { id: 'niconico', name: 'Niconico', color: '#FF6600', icon: siNiconico, domains: ['nicovideo.jp', 'nico.ms'], labels: [/niconico/i, /ニコニコ/i] },
  { id: 'spotify', name: 'Spotify', color: '#1DB954', icon: siSpotify, domains: ['spotify.com'], labels: [/spotify/i] },
  { id: 'apple-music', name: 'Apple Music', color: '#FA243C', icon: siApplemusic, domains: ['music.apple.com'], labels: [/apple\s*music/i] },
  { id: 'netease-music', name: 'NetEase Cloud Music', color: '#E20000', icon: siNeteasecloudmusic, domains: ['music.163.com'], labels: [/netease/i, /网易云音乐/i, /網易雲音樂/i] },
  { id: 'pixiv', name: 'pixiv', color: '#0096FA', icon: siPixiv, domains: ['pixiv.net'], labels: [/pixiv/i] },
  { id: 'piapro', name: 'piapro', color: '#00A0E9', icon: siPiapro, domains: ['piapro.jp'], labels: [/piapro/i, /ピアプロ/i] },
  { id: 'steam', name: 'Steam', color: '#66C0F4', icon: siSteam, domains: ['steampowered.com', 'steamcommunity.com'], labels: [/steam/i] },
  { id: 'wikipedia', name: 'Wikipedia', color: '#F5F5F5', icon: siWikipedia, domains: ['wikipedia.org'], labels: [/wikipedia/i, /维基百科/i, /維基百科/i, /ウィキペディア/i] },
];

const kamitsubakiPlatform = { id: 'kamitsubaki', name: 'KAMITSUBAKI', color: 'var(--wiki-accent-color, #89f5df)', icon: null };
const websitePlatform = { id: 'website', name: 'Official Website', color: 'var(--wiki-accent-color, #89f5df)', icon: null };

const cleanHostname = (href) => {
  try {
    return new URL(href, 'https://kamitsubaki.wiki').hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
};

const matchesDomain = (hostname, domain) => hostname === domain || hostname.endsWith(`.${domain}`);

export const detectExternalPlatform = ({ href = '', label = '' } = {}) => {
  const hostname = cleanHostname(href);
  const normalizedLabel = String(label).trim();
  const domainMatch = platformDefinitions.find((platform) => platform.domains.some((domain) => matchesDomain(hostname, domain)));
  if (domainMatch) return domainMatch;
  if (matchesDomain(hostname, 'kamitsubaki.jp')) return kamitsubakiPlatform;
  const labelMatch = platformDefinitions.find((platform) => platform.labels.some((pattern) => pattern.test(normalizedLabel)));
  if (labelMatch) return labelMatch;
  if (/kamitsubaki|神椿/i.test(normalizedLabel)) return kamitsubakiPlatform;
  return websitePlatform;
};

export const externalPlatformIds = [...platformDefinitions.map((platform) => platform.id), kamitsubakiPlatform.id, websitePlatform.id];
