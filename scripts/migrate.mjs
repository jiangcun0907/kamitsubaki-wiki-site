import { readdir, readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

async function walk(dir) {
  let results = [];
  const list = await readdir(dir);
  for (let file of list) {
    file = join(dir, file);
    const statObj = await stat(file);
    if (statObj && statObj.isDirectory()) {
      results = results.concat(await walk(file));
    } else {
      results.push(file);
    }
  }
  return results;
}

async function migrate() {
  const dirs = ['./src/content/artists', './src/content/projects'];
  for (const dir of dirs) {
    const files = await walk(dir);
    for (const file of files) {
      if (extname(file) === '.json') {
        const content = await readFile(file, 'utf8');
        const data = JSON.parse(content);
        
        // Generate YAML frontmatter
        let md = '---\n';
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string') {
            md += `${key}: "${value.replace(/"/g, '\\"')}"\n`;
          } else {
            md += `${key}: ${value}\n`;
          }
        }
        md += '---\n\n';
        
        const newPath = file.replace(/\.json$/, '.md');
        await writeFile(newPath, md, 'utf8');
        await unlink(file);
        console.log(`Migrated ${file} -> ${newPath}`);
      }
    }
  }
}

migrate().catch(console.error);
