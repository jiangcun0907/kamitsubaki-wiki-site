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

async function main() {
  const files = await findMdFiles(SONGS_DIR);
  let updatedCount = 0;

  for (const filePath of files) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    // Check if the file is missing lyrics
    if (!content.includes('my-lyric-box')) {
      // Check if it already has contentStatus
      if (!content.match(/^contentStatus:/m)) {
        // Insert contentStatus: stub into the frontmatter
        const newContent = content.replace(/^---\r?\n([\s\S]*?)\r?\n---/, (match, frontmatter) => {
          return `---\n${frontmatter}\ncontentStatus: stub\n---`;
        });
        
        if (content !== newContent) {
          await fs.promises.writeFile(filePath, newContent, 'utf-8');
          updatedCount++;
          console.log(`[UPDATED] Added stub to: ${filePath}`);
        }
      }
    }
  }

  console.log(`Done! Added 'contentStatus: stub' to ${updatedCount} files.`);
}

main();
