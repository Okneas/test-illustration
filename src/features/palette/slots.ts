import { SLOTS, type ColorTriple, type HexColor, type Palette, type SlotId } from './types'

export const SLOT_LABELS: Record<SlotId, string> = {
  bg1: 'Фон 1',
  bg2: 'Фон 2',
  bg3: 'Фон 3',
  obj1: 'Объект 1',
  obj2: 'Объект 2',
  obj3: 'Объект 3',
}

const SLOT_INDEX = { bg1: 0, bg2: 1, bg3: 2, obj1: 0, obj2: 1, obj3: 2 } as const

export const CUSTOM_PALETTE_ID = 'custom'
export const CUSTOM_PALETTE_NAME = 'Своя палитра'

export function getSlotColor(palette: Palette, slot: SlotId): HexColor {
  const index = SLOT_INDEX[slot]
  return slot.startsWith('bg') ? palette.bg[index] : palette.obj[index]
}

export function listSlots(palette: Palette): { slot: SlotId; label: string; color: HexColor }[] {
  return SLOTS.map((slot) => ({ slot, label: SLOT_LABELS[slot], color: getSlotColor(palette, slot) }))
}

function replaceAt(colors: ColorTriple, index: 0 | 1 | 2, color: HexColor): ColorTriple {
  return [index === 0 ? color : colors[0], index === 1 ? color : colors[1], index === 2 ? color : colors[2]]
}

/**
 * Палитра с одним изменённым цветом. Готовые схемы не правятся: изменение превращает их
 * в «Свою палитру», а у уже своей остаётся её имя.
 */
export function withSlotColor(palette: Palette, slot: SlotId, color: HexColor): Palette {
  const index = SLOT_INDEX[slot]
  const isCustom = palette.id === CUSTOM_PALETTE_ID
  return {
    id: CUSTOM_PALETTE_ID,
    name: isCustom ? palette.name : CUSTOM_PALETTE_NAME,
    bg: slot.startsWith('bg') ? replaceAt(palette.bg, index, color) : palette.bg,
    obj: slot.startsWith('obj') ? replaceAt(palette.obj, index, color) : palette.obj,
  }
}
