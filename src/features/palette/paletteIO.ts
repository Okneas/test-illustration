import type { HexColor, Palette } from './types'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export type PaletteParseResult =
  | { ok: true; palette: Palette }
  | { ok: false; error: string }

export function isHexColor(value: unknown): value is HexColor {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseTriple(value: unknown, field: 'bg' | 'obj'): [HexColor, HexColor, HexColor] | string {
  if (!Array.isArray(value) || value.length !== 3) {
    return `Поле «${field}» должно содержать ровно 3 цвета`
  }
  if (!value.every(isHexColor)) {
    const invalid: unknown = value.find((item) => !isHexColor(item))
    return `Цвет ${JSON.stringify(invalid)} в поле «${field}» не в формате #rrggbb`
  }
  const [first, second, third] = value
  return [first.toLowerCase() as HexColor, second.toLowerCase() as HexColor, third.toLowerCase() as HexColor]
}

/**
 * Проверяет данные палитры, пришедшие снаружи (файл пользователя). Значения потом попадают
 * в атрибуты fill/stroke, поэтому принимаются только строгие #rrggbb.
 */
export function parsePalette(input: unknown): PaletteParseResult {
  if (!isRecord(input)) {
    return { ok: false, error: 'Ожидается JSON-объект с полями name, bg и obj' }
  }
  const bg = parseTriple(input.bg, 'bg')
  if (typeof bg === 'string') return { ok: false, error: bg }
  const obj = parseTriple(input.obj, 'obj')
  if (typeof obj === 'string') return { ok: false, error: obj }
  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Своя палитра'
  return { ok: true, palette: { id: 'custom', name, bg, obj } }
}

export function parsePaletteJson(text: string): PaletteParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Файл не является корректным JSON' }
  }
  return parsePalette(data)
}

export function serializePalette(palette: Palette): string {
  return JSON.stringify({ name: palette.name, bg: palette.bg, obj: palette.obj }, null, 2)
}
