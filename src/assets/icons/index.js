/**
 * 在 dev/build 时通过 Vite 的 import.meta.glob 读取 @icons 目录下所有 .svg，
 * 供 Icon 组件按 name 内联渲染，便于通过 CSS color 控制图标颜色。
 * Icon 组件支持的图标列表由本模块的 iconNames 导出（由启动/构建时读取得到）。
 */

const modules = import.meta.glob('./*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** 从 glob 的 key（如 './player-play.svg'）得到 name（如 'player-play'） */
function pathToName(path) {
  const match = path.match(/\.\/([^/]+)\.svg$/);
  return match ? match[1] : path;
}

/**
 * 将 SVG 字符串中的 fill/stroke 替换为 currentColor，使图标能随 CSS color 变化。
 * 仅处理明确为纯色且非 currentColor 的写法，保留 opacity 等属性。
 */
function normalizeSvgForColor(svgString) {
  return svgString
    .replace(/\bfill="(?!none|currentColor)[^"]+"/gi, 'fill="currentColor"')
    .replace(/\bstroke="(?!none|currentColor)[^"]+"/gi, 'stroke="currentColor"');
}

const iconMap = /** @type {Record<string, string>} */ ({});
for (const [path, content] of Object.entries(modules)) {
  const raw = typeof content === 'string' ? content : '';
  iconMap[pathToName(path)] = normalizeSvgForColor(raw);
}

/** 当前 @icons 下所有 .svg 对应的 name 列表（dev/build 时读取得到，即 Icon 组件支持的图标名） */
export const iconNames = Object.keys(iconMap);

/**
 * @param {string} name - 图标名（对应 @icons 下文件名不含 .svg）
 * @returns {string} 该图标的 SVG 字符串（已做 currentColor 归一化），不存在则返回空字符串
 */
export function getIcon(name) {
  return iconMap[name] ?? '';
}
