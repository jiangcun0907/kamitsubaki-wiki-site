import fs from 'fs';
import path from 'path';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');

async function findMissing(dir, list = []) {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      await findMissing(filePath, list);
    } else if (file === 'ja.md') {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      if (!content.includes('my-lyric-box')) {
        const titleMatch = content.match(/^title:\s*(?:"([^"]+)"|(.+))$/m);
        const artistMatch = content.match(/^artist:\s*(?:"([^"]+)"|(.+))$/m);
        const categoryMatch = content.match(/^categoryTitle:\s*(?:"([^"]+)"|(.+))$/m);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : 'Unknown';
        const artist = artistMatch ? (artistMatch[1] || artistMatch[2]).trim() : 'Unknown';
        const category = categoryMatch ? (categoryMatch[1] || categoryMatch[2]).trim() : 'Unknown';
        list.push({ title, artist, category, path: filePath });
      }
    }
  }
  return list;
}

async function main() {
  const missing = await findMissing(SONGS_DIR);
  console.log(`Total missing: ${missing.length}`);
  
  // Group by artist for better view
  const grouped = {};
  for (const m of missing) {
    const key = m.artist;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }
  
  for (const [artist, songs] of Object.entries(grouped)) {
    console.log(`\n=== ${artist} ===`);
    for (const song of songs) {
      console.log(`- [${song.category}] ${song.title}`);
    }
  }
}

main();
