import type { SchemeIndex } from '@/features/library/types'
import type { Palette } from './types'

/** Три готовые схемы из Figma (значения считаны с образцов на странице библиотеки). */
export const PRESET_PALETTES = [
  {
    id: 'violet',
    name: 'Фиолетовая',
    bg: ['#d7cdf5', '#aa9bf0', '#7864d7'],
    obj: ['#f9ecb0', '#f9a3aa', '#ffe3e1'],
  },
  {
    id: 'peach',
    name: 'Персиковая',
    bg: ['#fdd7b9', '#fac896', '#d27532'],
    obj: ['#f9ecb0', '#80dada', '#beebeb'],
  },
  {
    id: 'mint',
    name: 'Мятная',
    bg: ['#beebeb', '#80dada', '#5abebe'],
    obj: ['#ffd4f2', '#6d7bfc', '#b6c6fe'],
  },
] as const satisfies readonly Palette[]

/** В этой схеме нарисованы все объекты библиотеки: перекраска всегда идёт от неё. */
export const SOURCE_PALETTE: Palette = PRESET_PALETTES[0]

/** Какой рисунок «Фона» брать для палитры: у готовых схем свой, у остальных — как у первой. */
export function getDecorScheme(palette: Palette): SchemeIndex {
  const index = PRESET_PALETTES.findIndex((preset) => preset.id === palette.id)
  return index === 1 ? 2 : index === 2 ? 3 : 1
}

export function getPresetPalette(scheme: SchemeIndex): Palette {
  return PRESET_PALETTES[scheme - 1]
}
