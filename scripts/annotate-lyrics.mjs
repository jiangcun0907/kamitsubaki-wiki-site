import fs from 'fs';
import path from 'path';
import KuroshiroImport from "kuroshiro";
import KuromojiAnalyzerImport from "kuroshiro-analyzer-kuromoji";
import * as wanakana from 'wanakana';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');

async function findMdFiles(dir, fileList = []) {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      await findMdFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function main() {
  const Kuroshiro = KuroshiroImport.default || KuroshiroImport;
  const KuromojiAnalyzer = KuromojiAnalyzerImport.default || KuromojiAnalyzerImport;
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());

  const files = await findMdFiles(SONGS_DIR);
  console.log(`Found ${files.length} markdown files. Applying furigana/romaji to jp-lyric...`);

  for (const file of files) {
    const content = await fs.promises.readFile(file, 'utf-8');
    if (!content.includes('jp-lyric')) continue;

    let updated = false;

    // Use a regex to match the block: <div class="jp-lyric">\n(content)\n</div>
    // We can match line by line or block by block.
    // The safest is to match <div class="jp-lyric">([^<]*?)<\/div> if there are no inner tags,
    // but the format is usually:
    // <div class="jp-lyric">
    // Some text
    // </div>
    // Let's use a regex that matches the div and its content.
    const regex = /<div class="jp-lyric">\s*([\s\S]*?)\s*<\/div>/g;
    
    // We will do a replacement sequentially since kuroshiro.convert is async.
    let newContent = content;
    
    const matches = [...content.matchAll(regex)];
    for (const match of matches) {
      const fullMatch = match[0];
      const innerText = match[1];
      
      // If it already contains <ruby>, skip
      if (innerText.includes('<ruby>')) {
        continue;
      }
      
      // Skip empty
      if (!innerText.trim()) {
        continue;
      }
      
      // Process text
      let processedHtml = "";
      
      // Handle lines separately if there are multiple lines inside one jp-lyric (usually not, but to be safe)
      const lines = innerText.split('\n');
      const processedLines = [];
      
      for (const line of lines) {
        if (!line.trim()) {
          processedLines.push(line);
          continue;
        }
        
        const furiganaHtml = await kuroshiro.convert(line.trim(), { mode: "furigana", to: "hiragana" });
        const parts = furiganaHtml.split(/(<ruby>.*?<\/ruby>)/g);
        
        let resultHtml = "";
        for (const part of parts) {
          if (!part) continue;
          if (part.startsWith("<ruby>")) {
            const m = part.match(/<ruby>(.*?)<rp>\(<\/rp><rt>(.*?)<\/rt><rp>\)<\/rp><\/ruby>/);
            if (m) {
              const kanji = m[1];
              const furi = m[2];
              const roma = wanakana.toRomaji(furi);
              resultHtml += `<ruby>${kanji}<rt class="furi">${furi}</rt><rt class="roma">${roma}</rt></ruby>`;
            } else {
              resultHtml += part;
            }
          } else {
            // plain text part
            for (const char of part) {
              if (wanakana.isKana(char)) {
                const roma = wanakana.toRomaji(char);
                resultHtml += `<ruby>${char}<rt class="roma">${roma}</rt></ruby>`;
              } else {
                resultHtml += char;
              }
            }
          }
        }
        processedLines.push(resultHtml);
      }
      
      const newMatch = `<div class="jp-lyric">\n${processedLines.join('\n')}\n</div>`;
      newContent = newContent.replace(fullMatch, newMatch);
      updated = true;
    }

    if (updated) {
      await fs.promises.writeFile(file, newContent, 'utf-8');
      console.log(`Updated ${file}`);
    }
  }
  
  console.log("Done updating lyrics.");
}

main().catch(console.error);
