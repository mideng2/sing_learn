#!/bin/bash
# 将 src/assets 下的 MP3 文件转换为 M4A
# 依赖：ffmpeg（macOS 安装：brew install ffmpeg）

ASSETS_DIR="$(cd "$(dirname "$0")/../src/assets" && pwd)"
cd "$ASSETS_DIR" || exit 1

if ! command -v ffmpeg &>/dev/null; then
  echo "错误：未找到 ffmpeg"
  echo "请先安装：brew install ffmpeg"
  exit 1
fi

count=0
while IFS= read -r -d '' mp3; do
  m4a="${mp3%.mp3}.m4a"
  if [[ -f "$m4a" ]]; then
    echo "跳过（已存在）: $(basename "$mp3")"
    continue
  fi
  echo "转换: $(basename "$mp3") -> $(basename "$m4a")"
  ffmpeg -y -i "$mp3" -c:a aac -b:a 128k "$m4a" -hide_banner -loglevel error && ((count++))
done < <(find . -type f -name "*.mp3" -print0)

echo ""
echo "完成，共转换 $count 个文件"
