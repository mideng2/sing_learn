import { Capacitor, registerPlugin } from "@capacitor/core";
import { Share } from "@capacitor/share";

const SingingAudio = registerPlugin("SingingAudio");

export function formatDateForFileName(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}${mm}${dd}-${hh}${mi}`;
}

export function sanitizeName(name) {
  return String(name || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .slice(0, 64);
}

export async function downloadRecording({ record, baseName }) {
  if (!record) return;
  const sourceUrl = record.mixFileUriWeb || record.mixFileUri;
  if (!sourceUrl) return;

  const songName = sanitizeName(baseName || record.songName || record.customName || "我的演唱") || "我的演唱";
  const timePart = formatDateForFileName(record.createdAt);
  const finalBaseName = timePart ? `${songName}_${timePart}` : songName;
  const extension = String(record.format || "m4a").toLowerCase();
  const fileName = `${finalBaseName}.${extension}`;

  try {
    if (Capacitor.isNativePlatform()) {
      let exportUri = record.mixFileUri;
      try {
        const prepared = await SingingAudio.prepareExportFile({
          sourceUri: record.mixFileUri,
          fileName,
        });
        if (prepared?.fileUri) {
          exportUri = prepared.fileUri;
        }
      } catch (prepareErr) {
        console.warn("[Recordings] prepareExportFile failed, fallback to source uri", prepareErr);
      }
      await Share.share({
        title: "导出录音",
        text: fileName,
        url: exportUri,
        dialogTitle: "保存录音到本地",
      });
      return;
    }

    const response = await fetch(sourceUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("[Recordings] download failed", error);
    window.alert("下载失败，请稍后重试。");
  }
}

