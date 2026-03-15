/**
 * 合并歌词脚本：将 jp 日文和 zh 中文歌词按时间整合成统一格式
 * 通过 kuroshiro 从 jp 生成 jm(假名) 和 rm(罗马音)
 *
 * 用法: node scripts/merge-lyrics.js [输入文件路径] [输出目录]
 * - 输入文件需 export 多个常量，每个常量形如 { jp, zh }
 * - 常量名作为输出文件名（如 guaiwu -> guaiwu.json）
 * 默认输入: src/assets/lyrics/歌词.js
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { pathToFileURL, fileURLToPath } from "url";
import KuroshiroModule from "kuroshiro";
import KuromojiAnalyzerModule from "kuroshiro-analyzer-kuromoji";

const Kuroshiro = KuroshiroModule?.default ?? KuroshiroModule;
const KuromojiAnalyzer = KuromojiAnalyzerModule?.default ?? KuromojiAnalyzerModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const TIME_REGEX = /^\[(\d{2}:\d{2}\.\d{3})\]\s*(.*)$/;

function parseLyrics(text) {
  if (!text || typeof text !== "string") return new Map();
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const result = new Map();
  for (const line of lines) {
    const match = line.match(TIME_REGEX);
    if (match) {
      const [, time, content] = match;
      const timeKey = `[${time}]`;
      const existing = result.get(timeKey);
      if (existing !== undefined) {
        result.set(timeKey, existing + "\n" + content);
      } else {
        result.set(timeKey, content);
      }
    }
  }
  return result;
}

function timeToSeconds(timeStr) {
  const match = timeStr.match(/\[(\d{2}):(\d{2})\.(\d{3})\]/);
  if (!match) return 0;
  const [, min, sec, ms] = match;
  return parseInt(min, 10) * 60 + parseInt(sec, 10) + parseInt(ms, 10) / 1000;
}

function mergeLyricsFromStrings(jpRaw, zhRaw) {
  const jpMap = parseLyrics(jpRaw);
  const zhMap = parseLyrics(zhRaw);
  const allTimes = new Set([...jpMap.keys(), ...zhMap.keys()]);
  const merged = Array.from(allTimes).map((time) => ({
    time,
    jp: jpMap.get(time) || "",
    zh: zhMap.get(time) || "",
  }));
  merged.sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
  return merged;
}

async function addKanaAndRomaji(merged, kuroshiro) {
  const convert = async (text) => {
    if (!text || !text.trim()) return { jm: "", rm: "" };
    const parts = text.split("\n");
    const jmParts = [];
    const rmParts = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) {
        jmParts.push("");
        rmParts.push("");
      } else {
        try {
          jmParts.push(await kuroshiro.convert(trimmed, { to: "hiragana", mode: "spaced" }));
          rmParts.push(await kuroshiro.convert(trimmed, { to: "romaji", mode: "spaced", romajiSystem: "hepburn" }));
        } catch {
          jmParts.push(trimmed);
          rmParts.push(trimmed);
        }
      }
    }
    return { jm: jmParts.join("\n"), rm: rmParts.join("\n") };
  };

  for (const item of merged) {
    const { jm, rm } = await convert(item.jp);
    item.jm = jm;
    item.rm = rm;
  }
  return merged;
}

const inputFile = process.argv[2] || "src/assets/lyrics/歌词.js";
const outputDir = process.argv[3] || dirname(inputFile);

(async () => {
  try {
    const inputPath = resolve(rootDir, inputFile);
    const inputUrl = pathToFileURL(inputPath).href;

    const module = await import(inputUrl);
    const entries = Object.entries(module).filter(([key, val]) => key !== "default" && val && typeof val === "object" && "jp" in val && "zh" in val);

    if (entries.length === 0) {
      console.error("未找到有效的歌词常量（需包含 jp、zh 字段）");
      process.exit(1);
    }

    console.log(`找到 ${entries.length} 个歌词常量: ${entries.map(([k]) => k).join(", ")}`);
    console.log("正在初始化 kuroshiro 解析器...");
    const kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer());
    console.log("正在批量转换...");

    const outDir = resolve(rootDir, outputDir);
    for (const [name, data] of entries) {
      const merged = mergeLyricsFromStrings(data.jp, data.zh);
      await addKanaAndRomaji(merged, kuroshiro);
      const outputPath = resolve(outDir, `${name}.json`);
      writeFileSync(outputPath, JSON.stringify(merged, null, 2), "utf-8");
      console.log(`  ${name}.json (${merged.length} 条)`);
    }
    console.log("批量转换完成");
  } catch (err) {
    console.error("处理失败:", err.message);
    process.exit(1);
  }
})();
