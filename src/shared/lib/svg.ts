export type ParsedSvg = {
  width: number
  height: number
  /** Содержимое между <svg> и </svg>. */
  inner: string
}

const SVG_ROOT = /^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/

function readAttribute(attributes: string, name: string): string | undefined {
  return new RegExp(`(?<=\\s)${name}="([^"]*)"`).exec(` ${attributes}`)?.[1]
}

/**
 * Разбирает SVG-файл библиотеки. Файлы выгружены из Figma с viewBox «0 0 width height»:
 * это условие нужно, чтобы вставлять содержимое в группу без вложенного <svg> и без смещений.
 */
export function parseSvg(source: string): ParsedSvg {
  const match = SVG_ROOT.exec(source)
  if (!match) throw new Error('Не удалось разобрать SVG: нет корневого элемента <svg>')
  const attributes = match[1] ?? ''
  const width = Number(readAttribute(attributes, 'width'))
  const height = Number(readAttribute(attributes, 'height'))
  const viewBox = readAttribute(attributes, 'viewBox')?.trim().split(/[\s,]+/).map(Number)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Не удалось разобрать SVG: нет корректных width/height')
  }
  const [minX, minY, boxWidth, boxHeight] = viewBox ?? []
  const viewBoxMatches =
    minX === 0 && minY === 0 && boxWidth !== undefined && boxHeight !== undefined &&
    Math.abs(boxWidth - width) < 1e-6 && Math.abs(boxHeight - height) < 1e-6
  if (!viewBoxMatches) {
    throw new Error(`Не удалось разобрать SVG: viewBox должен быть «0 0 ${width} ${height}»`)
  }
  return { width, height, inner: (match[2] ?? '').trim() }
}

/**
 * Делает id уникальными при сборке сцены из нескольких файлов. В выгрузке Figma они повторяются
 * («Vector» у каждого пути) и содержат искажённые имена слоёв, поэтому id, на которые никто не
 * ссылается, удаляются. Те, на которые есть ссылки `url(#…)` (например, clipPath у фона),
 * получают префикс `scope`, чтобы ссылки остались рабочими. Геометрию не затрагивает.
 */
export function scopeIds(markup: string, scope: string): string {
  const referenced = new Set([...markup.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]))
  return markup
    .replace(/\sid="([^"]*)"/g, (_match, id: string) => (referenced.has(id) ? ` id="${scope}-${id}"` : ''))
    .replace(/url\(#([^)]+)\)/g, (_match, id: string) => `url(#${scope}-${id})`)
}
