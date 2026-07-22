import fs from 'fs';
import path from 'path';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');

const COVER_ORIGINAL_ARTISTS = {
  "PLACEBO": "米津玄師",
  "不便な可愛げ": "ジェニーハイ",
  "About me": "蝶々P",
  "Hearts": "niki",
  "Leia": "ゆよゆっぺ",
  "unravel": "TK from 凛として時雨",
  "Uz": "Neru",
  "はくしの春": "ぬゆり",
  "エゴイスト": "大沼パセリ",
  "キレキャリオン": "ポリスピカデリー",
  "ビターチョコデコレーション": "syudou",
  "メリュー": "n-buna",
  "ラストリゾート": "Ayase",
  "君の脈で踊りたかった": "ピコン",
  "命のユースティティア": "Neru",
  "夜咄ディセイブ": "じん",
  "幸福な死を": "きくお",
  "悔やむと書いてミライ": "まふまふ",
  "未来になれなかったあの夜に": "amazarashi",
  "未来になれなかったあの夜に（ED）": "amazarashi",
  "残響": "164",
  "虎視眈々": "梅とら",
  "過去を喰らう": "カンザキイオリ",
  "鏡面の波": "YURiKA",
  "Caffeine": "秋山黄色",
  "chAngE": "miwa",
  "citi": "ぼくのりりっくのぼうよみ",
  "colors": "FLOW",
  "cult": "DUSTCELL",
  "CHOA": "",
  "みかんハート": "C&K",
  "ヤングアダルト": "マカロニえんぴつ"
};

async function findMdFiles(dir, fileList = []) {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      await findMdFiles(filePath, fileList);
    } else if (file.endsWith('.md') && file !== 'README.md') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function extractFrontmatterField(content, field) {
  const regex = new RegExp(`^${field}:\\s*(?:"([^"]+)"|(.+))$`, 'm');
  const match = content.match(regex);
  if (match) {
    return (match[1] || match[2]).trim();
  }
  return null;
}

function cleanTitle(title) {
  let cleaned = title.replace(/\s*[([].*?[)\]]/g, '').trim();
  cleaned = cleaned.replace(/sinka ver\./i, '').trim();
  cleaned = cleaned.replace(/acoustic ver\./i, '').trim();
  cleaned = cleaned.replace(/-inst\.ver-/i, '').trim();
  cleaned = cleaned.replace(/Rearranged Ver\./i, '').trim();
  cleaned = cleaned.replace(/I SCREAM LIVE[0-9]* ver\./i, '').trim();
  cleaned = cleaned.replace(/at CREAM PUFF LIVE[0-9]*/i, '').trim();
  cleaned = cleaned.replace(/Remix/i, '').trim();
  return cleaned.trim();
}

function splitArtists(artistString) {
  if (!artistString) return [];
  return artistString.split(/&|×|,|feat\.|with/i)
                     .map(a => a.trim())
                     .filter(Boolean);
}

const lyricsCache = new Map();

async function fetchLyricsLrclib(trackName, artistName) {
  const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
  try {
    const response = await fetch(searchUrl);
    if (!response.ok) return null;
    const data = await response.json();
    const valid = data.find(x => x.plainLyrics);
    if (valid) return valid.plainLyrics;
  } catch (error) {
    console.error(`lrclib error:`, error);
  }
  return null;
}

async function fetchLyricsNetease(trackName) {
  const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(trackName)}&type=1&limit=5`;
  try {
    const response = await fetch(searchUrl);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.result && data.result.songs && data.result.songs.length > 0) {
      for (const song of data.result.songs) {
        const lyricUrl = `https://music.163.com/api/song/lyric?os=pc&id=${song.id}&lv=-1&kv=-1&tv=-1`;
        const lyricRes = await fetch(lyricUrl);
        if (lyricRes.ok) {
          const lData = await lyricRes.json();
          if (lData.lrc && lData.lrc.lyric) {
            const rawLyric = lData.lrc.lyric;
            if (rawLyric.includes('纯音乐')) continue; // Skip instrumental
            
            // Clean LRC timestamps and metadata
            const cleanLyric = rawLyric.split('\n')
              .map(line => line.replace(/\[.*?\]\s*/g, '').trim())
              .filter(line => line && !line.match(/^(?:作词|作曲|编曲|Vocal|Mix|Mastering|Guitar|Bass|Drums)\s*:/i))
              .join('\n');
            
            if (cleanLyric.length > 20) {
              return cleanLyric;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`netease error:`, error);
  }
  return null;
}

async function fetchLyrics(trackName, artistName, isCover) {
  const cacheKey = `${trackName}|${artistName}|${isCover}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  let lyrics = null;

  // 1. Try Cover mapping on lrclib
  if (isCover) {
    const originalArtist = COVER_ORIGINAL_ARTISTS[trackName];
    if (originalArtist) {
      lyrics = await fetchLyricsLrclib(trackName, originalArtist);
    }
  }

  // 2. Try Split Artists on lrclib
  if (!lyrics) {
    const artists = splitArtists(artistName);
    for (const a of artists) {
      lyrics = await fetchLyricsLrclib(trackName, a);
      if (lyrics) break;
    }
  }

  // 3. Try fallback title-only on lrclib (first valid hit)
  if (!lyrics) {
    try {
      const fallbackUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}`;
      const fbResp = await fetch(fallbackUrl);
      if (fbResp.ok) {
        const fbData = await fbResp.json();
        const valid = fbData.find(x => x.plainLyrics);
        if (valid) {
          lyrics = valid.plainLyrics;
        }
      }
    } catch(e) {}
  }

  // 4. Ultimate fallback: Netease Cloud Music
  if (!lyrics) {
    lyrics = await fetchLyricsNetease(trackName);
  }

  lyricsCache.set(cacheKey, lyrics);
  return lyrics;
}

function formatLyrics(plainLyrics, header) {
  const lines = plainLyrics.split('\n');
  let formatted = `${header}\n\n{{lyrics-controls::ja}}\n\n<div class="my-lyric-box">\n\n`;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      formatted += `<br />\n\n`;
    } else {
      formatted += `<div class="lyric-line">\n<div class="jp-lyric">\n${trimmed}\n</div>\n</div>\n\n`;
    }
  }
  
  formatted += `</div>\n`;
  return formatted;
}

function getLocalizedHeader(locale) {
  switch(locale) {
    case 'zh': return '## 歌词';
    case 'zh-tw': return '## 歌詞';
    case 'en': return '## Lyrics';
    case 'ko': return '## 가사';
    default: return '## 歌詞';
  }
}

function getLocalizedSourceHeader(locale) {
  switch(locale) {
    case 'zh': return '## 来源';
    case 'zh-tw': return '## 來源';
    case 'en': return '## Sources';
    case 'ko': return '## 출처';
    default: return '## 出典';
  }
}

async function processFile(filePath) {
  try {
    let content = await fs.promises.readFile(filePath, 'utf-8');
    
    if (content.includes('my-lyric-box')) {
      return;
    }

    const locale = extractFrontmatterField(content, 'locale') || 'ja';
    const dir = path.dirname(filePath);
    const jaMdPath = path.join(dir, 'ja.md');
    let title = null;
    let artist = null;
    let categorySubtitle = null;
    
    try {
      const jaContent = await fs.promises.readFile(jaMdPath, 'utf-8');
      title = extractFrontmatterField(jaContent, 'title');
      artist = extractFrontmatterField(jaContent, 'artist');
      categorySubtitle = extractFrontmatterField(jaContent, 'categorySubtitle');
    } catch (e) {
      title = extractFrontmatterField(content, 'title');
      artist = extractFrontmatterField(content, 'artist');
      categorySubtitle = extractFrontmatterField(content, 'categorySubtitle');
    }
    
    if (!title || !artist) {
      return;
    }

    const cleanedTitle = cleanTitle(title);
    const isCover = categorySubtitle === 'COVERS';

    const lyrics = await fetchLyrics(cleanedTitle, artist, isCover);
    if (!lyrics) {
      console.log(`[FAILED] ${cleanedTitle} by ${artist} (${locale})`);
      return;
    }
    console.log(`[SUCCESS] ${cleanedTitle} by ${artist} (${locale})`);

    const header = getLocalizedHeader(locale);
    const formattedLyrics = formatLyrics(lyrics, header);
    
    const lyricsSectionRegex = /## (?:歌詞|歌词|Lyrics|가사)\s*[\s\S]*?(?=\n## |$)/i;
    
    if (lyricsSectionRegex.test(content)) {
      content = content.replace(lyricsSectionRegex, formattedLyrics + '\n\n');
    } else {
      const sourceHeader = getLocalizedSourceHeader(locale);
      if (content.includes(sourceHeader)) {
        content = content.replace(sourceHeader, formattedLyrics + '\n\n' + sourceHeader);
      } else {
        content += '\n\n' + formattedLyrics;
      }
    }

    await fs.promises.writeFile(filePath, content, 'utf-8');
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function main() {
  const files = await findMdFiles(SONGS_DIR);
  console.log(`Found ${files.length} markdown files. Scanning for missing lyrics...`);

  for (let i = 0; i < files.length; i++) {
    await processFile(files[i]);
    // Prevent API spam
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('Done!');
}

main();
