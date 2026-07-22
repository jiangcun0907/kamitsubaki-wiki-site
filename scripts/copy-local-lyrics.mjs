import fs from 'fs';
import path from 'path';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');

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
  cleaned = cleaned.replace(/feat\..*$/i, '').trim(); // newly added
  cleaned = cleaned.replace(/sinka ver\./i, '').trim();
  cleaned = cleaned.replace(/acoustic ver\./i, '').trim();
  cleaned = cleaned.replace(/-inst\.ver-/i, '').trim();
  cleaned = cleaned.replace(/Rearranged Ver\./i, '').trim();
  cleaned = cleaned.replace(/I SCREAM LIVE[0-9]* ver\./i, '').trim();
  cleaned = cleaned.replace(/at CREAM PUFF LIVE[0-9]*/i, '').trim();
  cleaned = cleaned.replace(/Remix/i, '').trim();
  return cleaned.trim();
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

async function main() {
  const files = await findMdFiles(SONGS_DIR);
  
  // map: locale -> cleanedTitle -> { lyricsBlock, sourceArtist }
  const lyricsDB = {};
  const fileRecords = [];

  console.log(`Scanning ${files.length} files...`);

  // Pass 1: Build DB
  for (const filePath of files) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const locale = extractFrontmatterField(content, 'locale') || 'ja';
    
    // Get title from ja.md if exists
    let title = null;
    let artist = null;
    const jaMdPath = path.join(path.dirname(filePath), 'ja.md');
    try {
      const jaContent = await fs.promises.readFile(jaMdPath, 'utf-8');
      title = extractFrontmatterField(jaContent, 'title');
      artist = extractFrontmatterField(jaContent, 'artist');
    } catch (e) {
      title = extractFrontmatterField(content, 'title');
      artist = extractFrontmatterField(content, 'artist');
    }
    
    if (!title || !artist) continue;
    
    const cleanedTitle = cleanTitle(title);
    const hasLyrics = content.includes('my-lyric-box');
    
    fileRecords.push({
      filePath, content, locale, cleanedTitle, artist, hasLyrics
    });
    
    if (hasLyrics) {
      // Extract the lyrics block
      const lyricsRegex = /(## (?:歌詞|歌词|Lyrics|가사)\s*[\s\S]*?)(?=\n## |$)/i;
      const match = content.match(lyricsRegex);
      if (match) {
        if (!lyricsDB[locale]) lyricsDB[locale] = {};
        if (!lyricsDB[locale][cleanedTitle]) {
          lyricsDB[locale][cleanedTitle] = {
            lyricsBlock: match[1].trim(),
            sourceArtist: artist
          };
        }
      }
    }
  }
  
  // Pass 2: Copy lyrics
  let copiedCount = 0;
  for (const record of fileRecords) {
    if (!record.hasLyrics) {
      const dbEntry = lyricsDB[record.locale]?.[record.cleanedTitle];
      // Only copy if we found lyrics and it's from a different artist
      if (dbEntry && dbEntry.sourceArtist !== record.artist) {
        let newContent = record.content;
        const lyricsSectionRegex = /## (?:歌詞|歌词|Lyrics|가사)\s*[\s\S]*?(?=\n## |$)/i;
        
        if (lyricsSectionRegex.test(newContent)) {
          newContent = newContent.replace(lyricsSectionRegex, dbEntry.lyricsBlock + '\n\n');
        } else {
          const sourceHeader = getLocalizedSourceHeader(record.locale);
          if (newContent.includes(sourceHeader)) {
            newContent = newContent.replace(sourceHeader, dbEntry.lyricsBlock + '\n\n' + sourceHeader);
          } else {
            newContent += '\n\n' + dbEntry.lyricsBlock;
          }
        }
        
        await fs.promises.writeFile(record.filePath, newContent, 'utf-8');
        copiedCount++;
        console.log(`[COPIED] ${record.cleanedTitle} (${record.locale}): copied from ${dbEntry.sourceArtist} to ${record.artist}`);
      }
    }
  }
  
  console.log(`Done! Copied lyrics to ${copiedCount} files.`);
}

main();
