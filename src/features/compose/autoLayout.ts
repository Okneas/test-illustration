import type { Format } from '@/features/scene/types'
import { createRandom } from '@/shared/lib/random'

/** Пресеты раскладки из Figma («SVG-drop»): собранно, со смещением, место под заголовок слева. */
export const LAYOUT_MODES = ['compact', 'offset', 'headline'] as const
export type LayoutMode = (typeof LAYOUT_MODES)[number]

export type LayoutItem = { width: number; height: number }
export type Point = { x: number; y: number }

/** Доля ширины слева, которую режим «под заголовок» оставляет свободной. */
export const HEADLINE_SPACE = 0.42

/** Насколько режим «собранно» подтягивает объекты к центру области. */
const COMPACT_PULL = 0.7

/** Дрожание позиций при seed ≠ 0, доля от размера ячейки. */
const JITTER = 0.12

/**
 * Часть габарита объекта, которую считаем его «телом»: у изометрических объектов по краям
 * пустые углы, поэтому частичное наложение рамок допустимо, а вот прятать один объект
 * целиком за другим нельзя.
 */
const CORE_SHARE = 0.6
const SEPARATION_PASSES = 24
/** Центр объекта не ближе этой доли размера области к её краю: объект не теряется за границей. */
const EDGE_MARGIN = 0.1

type Area = { x0: number; y0: number; x1: number; y1: number }

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Раздвигает объекты, чьи «тела» пересеклись: по оси с меньшим наложением, причём меньший
 * объект сдвигается сильнее большого. Центры остаются внутри области.
 */
function separate(centers: Point[], items: readonly LayoutItem[], area: Area): void {
  const marginX = (area.x1 - area.x0) * EDGE_MARGIN
  const marginY = (area.y1 - area.y0) * EDGE_MARGIN
  for (let pass = 0; pass < SEPARATION_PASSES; pass += 1) {
    let moved = false
    for (let i = 0; i < centers.length; i += 1) {
      for (let j = i + 1; j < centers.length; j += 1) {
        const a = items[i]
        const b = items[j]
        const ca = centers[i]
        const cb = centers[j]
        if (!a || !b || !ca || !cb) continue
        const dx = cb.x - ca.x
        const dy = cb.y - ca.y
        const overlapX = ((a.width + b.width) * CORE_SHARE) / 2 - Math.abs(dx)
        const overlapY = ((a.height + b.height) * CORE_SHARE) / 2 - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue

        const areaA = a.width * a.height
        const areaB = b.width * b.height
        const shareA = areaB / (areaA + areaB)
        const shareB = 1 - shareA
        if (overlapX <= overlapY) {
          const direction = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx)
          ca.x -= direction * overlapX * shareA
          cb.x += direction * overlapX * shareB
        } else {
          const direction = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy)
          ca.y -= direction * overlapY * shareA
          cb.y += direction * overlapY * shareB
        }
        moved = true
      }
    }
    for (const center of centers) {
      center.x = clamp(center.x, area.x0 + marginX, area.x1 - marginX)
      center.y = clamp(center.y, area.y0 + marginY, area.y1 - marginY)
    }
    if (!moved) break
  }
}

/**
 * Расставляет объекты по сетке ячеек в рабочей области формата. Размеры объектов не меняются:
 * они стоят 1:1, поэтому крупные объекты перекрываются и могут выходить за край, как в примерах.
 * Возвращает левые верхние углы в порядке входных объектов. С одним и тем же seed результат
 * одинаков, другой seed даёт другой вариант.
 */
export function layoutComposition(
  items: readonly LayoutItem[],
  format: Pick<Format, 'width' | 'height'>,
  mode: LayoutMode,
  seed = 0,
): Point[] {
  if (items.length === 0) return []

  const areaX = mode === 'headline' ? format.width * HEADLINE_SPACE : 0
  const areaWidth = format.width - areaX
  const areaHeight = format.height
  const centerX = areaX + areaWidth / 2
  const centerY = areaHeight / 2

  const columns = Math.min(items.length, Math.max(1, Math.round(Math.sqrt((items.length * areaWidth) / areaHeight))))
  const rows = Math.ceil(items.length / columns)
  const cellWidth = areaWidth / columns
  const cellHeight = areaHeight / rows
  const random = seed === 0 ? null : createRandom(seed)

  const centers = items.map((_, index): Point => {
    const row = Math.floor(index / columns)
    const column = index % columns
    // В последней неполной строке объекты центрируются, а не жмутся влево.
    const inRow = row === rows - 1 ? items.length - row * columns : columns
    const rowShift = ((columns - inRow) * cellWidth) / 2
    let x = areaX + rowShift + (column + 0.5) * cellWidth
    let y = (row + 0.5) * cellHeight

    if (mode === 'offset') x += (row % 2 === 0 ? -1 : 1) * cellWidth * 0.2
    if (mode === 'compact') {
      x = centerX + (x - centerX) * COMPACT_PULL
      y = centerY + (y - centerY) * COMPACT_PULL
    }
    if (random) {
      x += (random() - 0.5) * 2 * JITTER * cellWidth
      y += (random() - 0.5) * 2 * JITTER * cellHeight
    }
    return { x, y }
  })

  separate(centers, items, { x0: areaX, y0: 0, x1: format.width, y1: format.height })

  return centers.map((center, index) => ({
    x: Math.round(center.x - (items[index]?.width ?? 0) / 2),
    y: Math.round(center.y - (items[index]?.height ?? 0) / 2),
  }))
}
