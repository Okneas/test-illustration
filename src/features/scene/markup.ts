import type { SchemeIndex, Size } from '@/features/library/types'
import { recolorSvg } from '@/features/palette/recolor'
import { getPresetPalette, SOURCE_PALETTE } from '@/features/palette/schemes'
import type { Palette } from '@/features/palette/types'
import { parseSvg, scopeIds, type ParsedSvg } from '@/shared/lib/svg'
import type { CanvasObject } from './types'

const round = (value: number) => Math.round(value * 1000) / 1000

/**
 * Рисунок фона всегда берётся из L-файлов: он растягивается на весь холст (см. `decorTransform`),
 * а размеры объектов, которые теперь у каждого свои, на него не влияют.
 */
export const DECOR_SIZE: Size = 'L'

/**
 * Разметка объекта библиотеки в выбранной палитре. Общая для холста и экспорта.
 * `scope` — уникальный префикс для id внутри файла (например, id экземпляра на холсте).
 */
export function prepareObject(svg: string, palette: Palette, scope: string): ParsedSvg {
  const { width, height, inner } = parseSvg(recolorSvg(svg, SOURCE_PALETTE, palette))
  return { width, height, inner: scopeIds(inner, scope) }
}

/** Рисунок фона нарисован в своей схеме, поэтому красим от неё. */
export function prepareDecor(svg: string, scheme: SchemeIndex, palette: Palette, scope: string): ParsedSvg {
  const { width, height, inner } = parseSvg(recolorSvg(svg, getPresetPalette(scheme), palette))
  return { width, height, inner: scopeIds(inner, scope) }
}

/** transform для группы объекта: перенос в левый верхний угол и поворот вокруг центра. */
export function objectTransform(
  { x, y, rotation }: Pick<CanvasObject, 'x' | 'y' | 'rotation'>,
  width: number,
  height: number,
): string {
  const move = `translate(${round(x)} ${round(y)})`
  return rotation === 0 ? move : `${move} rotate(${round(rotation)} ${round(width / 2)} ${round(height / 2)})`
}

/**
 * Рисунок фона закрывает весь холст: равномерно растягивается до покрытия и прижимается к правому
 * нижнему углу, лишнее обрезается границами. Так тень в нижнем правом углу, видная во всех примерах
 * Figma, остаётся на месте для S (500×500), L (1000×1000) и вытянутых форматов. Объекты при этом
 * остаются строго 1:1.
 */
export function decorTransform(
  format: { width: number; height: number },
  decor: { width: number; height: number },
): string {
  const scale = Math.max(format.width / decor.width, format.height / decor.height)
  const x = round(format.width - decor.width * scale)
  const y = round(format.height - decor.height * scale)
  const move = `translate(${x} ${y})`
  return scale === 1 ? move : `${move} scale(${round(scale)})`
}
