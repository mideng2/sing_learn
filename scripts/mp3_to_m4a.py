#!/usr/bin/env python3
"""将 src/assets 下的 MP3 文件转换为 M4A
依赖：ffmpeg（macOS 安装：brew install ffmpeg）
"""

import shutil
import subprocess
import sys
from pathlib import Path

ASSETS_DIR = Path(__file__).resolve().parent.parent / "src" / "assets"


def main():
    if not shutil.which("ffmpeg"):
        print("错误：未找到 ffmpeg")
        print("请先安装：brew install ffmpeg")
        sys.exit(1)

    if not ASSETS_DIR.exists():
        print(f"错误：目录不存在 {ASSETS_DIR}")
        sys.exit(1)

    mp3_files = list(ASSETS_DIR.rglob("*.mp3"))
    count = 0

    for mp3 in mp3_files:
        m4a = mp3.with_suffix(".m4a")
        if m4a.exists():
            print(f"跳过（已存在）: {mp3.name}")
            continue

        print(f"转换: {mp3.name} -> {m4a.name}")
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(mp3), "-c:a", "aac", "-b:a", "256k", str(m4a)],
                capture_output=True,
                check=True,
            )
            count += 1
        except subprocess.CalledProcessError as e:
            print(f"  失败: {e.stderr.decode() if e.stderr else e}")

    print(f"\n完成，共转换 {count} 个文件")


if __name__ == "__main__":
    main()
