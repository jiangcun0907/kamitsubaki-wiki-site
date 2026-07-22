import fs from 'fs';
import path from 'path';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');

// Make sure to set DEEPSEEK_API_KEY in your environment before running
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/chat/completions';

// Helper to recursively find markdown files
async function findMdFiles(dir, fileList = []) {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      await findMdFiles(filePath, fileList);
    } else if (filePath.endsWith('zh.md') || filePath.endsWith('en.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Function to call DeepSeek API
async function translateLyrics(lines, targetLang) {
  if (!API_KEY) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not set.");
  }

  const langName = targetLang === 'zh' ? 'Chinese (Simplified)' : 'English';

  const systemPrompt = `You are an expert lyrics translator. Translate the following Japanese lyrics into ${langName}.
Maintain the poetic feel and context. 
CRITICAL: The output MUST be a strict JSON array of strings, where each string corresponds exactly to the 1-to-1 translation of the input line at the same index. 
Do not output any markdown formatting around the JSON (no \`\`\`json). Just the raw JSON array.
If an input line is empty or just punctuation, return an empty string or equivalent punctuation for that index.`;

  const userPrompt = `Input lines:\n${JSON.stringify(lines, null, 2)}`;

  const requestBody = {
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const textResponse = data.choices[0].message.content.trim();

  // Clean up any possible markdown formatting
  let cleanJson = textResponse;
  if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
  if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
  if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

  return JSON.parse(cleanJson.trim());
}

async function processFile(filePath) {
  const lang = filePath.endsWith('zh.md') ? 'zh' : 'en';
  const targetClass = lang === 'zh' ? 'cn-lyric' : 'trans-lyric';

  let content = await fs.promises.readFile(filePath, 'utf-8');

  // Skip if already translated
  if (content.includes(targetClass)) {
    return;
  }

  if (!content.includes('jp-lyric')) {
    return;
  }

  console.log(`\nProcessing ${filePath}...`);

  const regex = /<div class="jp-lyric">\s*([\s\S]*?)\s*<\/div>/g;
  const matches = [...content.matchAll(regex)];

  // Extract all plain text lines
  const originalLines = matches.map(match => {
    const innerHtml = match[1];
    return innerHtml.replace(/<rt.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/\n/g, '').replace(/\s+/g, ' ').trim();
  });

  // Translate
  console.log(`Translating ${originalLines.length} lines into ${lang}...`);
  let translatedLines = [];
  try {
    translatedLines = await translateLyrics(originalLines, lang);
  } catch (err) {
    console.error(`Failed to translate ${filePath}: ${err.message}`);
    return;
  }

  if (translatedLines.length !== matches.length) {
    console.error(`Mismatch in translated lines count! Expected ${matches.length}, got ${translatedLines.length}`);
    return;
  }

  // Inject translations back
  let newContent = content;
  for (let i = 0; i < matches.length; i++) {
    const fullMatch = matches[i][0];
    const trans = translatedLines[i];

    if (trans) {
      const newMatch = fullMatch + `\n<div class="${targetClass}">${trans}</div>`;
      newContent = newContent.replace(fullMatch, newMatch);
    }
  }

  await fs.promises.writeFile(filePath, newContent, 'utf-8');
  console.log(`✅ Successfully updated ${filePath}`);
}

async function main() {
  if (!API_KEY) {
    console.error("ERROR: Please set the DEEPSEEK_API_KEY environment variable.");
    console.error("Example: $env:DEEPSEEK_API_KEY='your_api_key' ; node scripts/translate-lyrics.mjs");
    process.exit(1);
  }

  const files = await findMdFiles(SONGS_DIR);
  console.log(`Found ${files.length} localization files. Checking for missing translations...`);

  for (const file of files) {
    await processFile(file);
    // Be nice to the API rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("All done!");
}

main().catch(console.error);
