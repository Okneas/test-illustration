import { describe, expect, it } from 'vitest'
import { PRESET_PALETTES } from './schemes'
import { CUSTOM_PALETTE_ID, CUSTOM_PALETTE_NAME, getSlotColor, listSlots, withSlotColor } from './slots'

const [violet] = PRESET_PALETTES

describe('listSlots', () => {
  it('отдаёт шесть слотов в порядке «фон 1–3, объект 1–3»', () => {
    expect(listSlots(violet).map((entry) => entry.color)).toEqual([...violet.bg, ...violet.obj])
    expect(listSlots(violet).map((entry) => entry.label)).toEqual(['Фон 1', 'Фон 2', 'Фон 3', 'Объект 1', 'Объект 2', 'Объект 3'])
  })

  it('getSlotColor читает нужный цвет', () => {
    expect(getSlotColor(violet, 'bg3')).toBe('#7864d7')
    expect(getSlotColor(violet, 'obj2')).toBe('#f9a3aa')
  })
})

describe('withSlotColor', () => {
  it('меняет только один слот', () => {
    const result = withSlotColor(violet, 'obj2', '#112233')
    expect(result.obj).toEqual(['#f9ecb0', '#112233', '#ffe3e1'])
    expect(result.bg).toEqual(violet.bg)
  })

  it('превращает готовую схему в свою и не трогает оригинал', () => {
    const result = withSlotColor(violet, 'bg1', '#000000')
    expect(result.id).toBe(CUSTOM_PALETTE_ID)
    expect(result.name).toBe(CUSTOM_PALETTE_NAME)
    expect(violet.bg[0]).toBe('#d7cdf5')
  })

  it('у своей палитры сохраняет имя', () => {
    const custom = { ...violet, id: CUSTOM_PALETTE_ID, name: 'Закат' }
    expect(withSlotColor(custom, 'bg2', '#abcdef').name).toBe('Закат')
  })
})
