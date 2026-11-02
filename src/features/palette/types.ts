export type HexColor = `#${string}`

export type ColorTriple = readonly [HexColor, HexColor, HexColor]

/**
 * Палитра из Figma: три цвета фона и три цвета объектов (плюс неизменные чёрный и белый).
 * Цвета фона допустимы в объектах, цвета объектов — нет, поэтому слоты разделены.
 */
export type Palette = {
  id: string
  name: string
  bg: ColorTriple
  obj: ColorTriple
}

export const SLOTS = ['bg1', 'bg2', 'bg3', 'obj1', 'obj2', 'obj3'] as const
export type SlotId = (typeof SLOTS)[number]
