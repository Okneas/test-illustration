import type { Palette } from './types'

// fill и stroke: у объектов только fill, у фонов есть и stroke. Остальные атрибуты
// (d, viewBox, width, height, transform) перекраска не трогает: объект копируется «как есть».
const PAINT_ATTRIBUTE = /(?<=\s)(fill|stroke)="([^"]*)"/g

function buildColorMap(from: Palette, to: Palette): Map<string, string> {
  const map = new Map<string, string>()
  const pairs = [...from.bg.map((color, i) => [color, to.bg[i]] as const), ...from.obj.map((color, i) => [color, to.obj[i]] as const)]
  for (const [source, target] of pairs) {
    const key = source.toLowerCase()
    if (map.has(key)) {
      throw new Error(`Палитра-источник «${from.name}» содержит повторяющийся цвет ${source}`)
    }
    map.set(key, target)
  }
  return map
}

/**
 * Заменяет цвета слотов палитры `from` на цвета тех же слотов палитры `to`.
 * Чёрный, белый и `none` не входят в слоты и остаются как есть.
 */
export function recolorSvg(svg: string, from: Palette, to: Palette): string {
  const map = buildColorMap(from, to)
  return svg.replace(PAINT_ATTRIBUTE, (match, attribute: string, value: string) => {
    const target = map.get(value.toLowerCase())
    return target ? `${attribute}="${target}"` : match
  })
}

/** Все значения fill/stroke в SVG (в нижнем регистре, без повторов), без `none`. */
export function collectPaints(svg: string): Set<string> {
  const paints = new Set<string>()
  for (const match of svg.matchAll(PAINT_ATTRIBUTE)) {
    const value = match[2]?.toLowerCase()
    if (value && value !== 'none') paints.add(value)
  }
  return paints
}
