const fs = require('fs');
const content = fs.readFileSync('src/content/songs/vwp/genealogy/定命-destiny-運命/zh.md', 'utf8');
const regex = /## (?:歌詞|歌词|Lyrics|가사)\s*[\s\S]*?(?=\n## |\Z)/i;
const match = regex.exec(content);
if (match) {
  console.log("MATCHED STRING LENGTH:", match[0].length);
  console.log("MATCHED STRING ENDS WITH:", JSON.stringify(match[0].slice(-20)));
} else {
  console.log("NO MATCH");
}
