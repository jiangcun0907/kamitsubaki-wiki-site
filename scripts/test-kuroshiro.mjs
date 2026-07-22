import KuroshiroImport from "kuroshiro";
import KuromojiAnalyzerImport from "kuroshiro-analyzer-kuromoji";
import * as wanakana from 'wanakana';

async function main() {
  const Kuroshiro = KuroshiroImport.default || KuroshiroImport;
  const KuromojiAnalyzer = KuromojiAnalyzerImport.default || KuromojiAnalyzerImport;
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
  
  const text = "崩れていく。Hello world";
  const furiganaHtml = await kuroshiro.convert(text, { mode: "furigana", to: "hiragana" });
  
  // Parse the furigana html
  // regex to match `<ruby>...</ruby>` or plain text
  const parts = furiganaHtml.split(/(<ruby>.*?<\/ruby>)/g);
  
  let resultHtml = "";
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("<ruby>")) {
      const match = part.match(/<ruby>(.*?)<rp>\(<\/rp><rt>(.*?)<\/rt><rp>\)<\/rp><\/ruby>/);
      if (match) {
        const kanji = match[1];
        const furi = match[2];
        const roma = wanakana.toRomaji(furi);
        resultHtml += `<ruby>${kanji}<rt class="furi">${furi}</rt><rt class="roma">${roma}</rt></ruby>`;
      } else {
        resultHtml += part;
      }
    } else {
      // Split into characters
      for (const char of part) {
        if (wanakana.isKana(char)) {
          const roma = wanakana.toRomaji(char);
          resultHtml += `<ruby>${char}<rt class="roma">${roma}</rt></ruby>`;
        } else {
          resultHtml += char; // Keep english/punctuation as is
        }
      }
    }
  }
  
  console.log("Input:", text);
  console.log("Furigana HTML:", furiganaHtml);
  console.log("Result HTML:\n" + resultHtml);
}
main();
