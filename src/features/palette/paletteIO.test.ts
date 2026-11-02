import { describe, expect, it } from 'vitest'
import { isHexColor, parsePalette, parsePaletteJson, serializePalette } from './paletteIO'

const VALID = {
  name: 'Закат',
  bg: ['#FFE0D0', '#FFB090', '#C05030'],
  obj: ['#FFF0A0', '#A0E0D0', '#E0F8F0'],
}

describe('parsePalette', () => {
  it('принимает корректную палитру и приводит цвета к нижнему регистру', () => {
    const result = parsePalette(VALID)
    expect(result).toEqual({
      ok: true,
      palette: {
        id: 'custom',
        name: 'Закат',
        bg: ['#ffe0d0', '#ffb090', '#c05030'],
        obj: ['#fff0a0', '#a0e0d0', '#e0f8f0'],
      },
    })
  })

  it('подставляет название, если оно не задано', () => {
    const result = parsePalette({ bg: VALID.bg, obj: VALID.obj })
    expect(result.ok && result.palette.name).toBe('Своя палитра')
  })

  it.each([
    ['не объект', 'text'],
    ['массив вместо объекта', []],
    ['null', null],
  ])('отклоняет вход: %s', (_title, input) => {
    expect(parsePalette(input)).toMatchObject({ ok: false })
  })

  it('отклоняет неверное число цветов', () => {
    expect(parsePalette({ ...VALID, bg: ['#ffffff'] })).toEqual({
      ok: false,
      error: 'Поле «bg» должно содержать ровно 3 цвета',
    })
  })

  it.each(['red', '#fff', '#12345g', 'url(#x)', '#ffffff" onload="x', 42])(
    'отклоняет цвет %j: в атрибут fill попадают только #rrggbb',
    (color) => {
      const result = parsePalette({ ...VALID, obj: [color, '#000000', '#000000'] })
      expect(result).toMatchObject({ ok: false })
    },
  )
})

describe('parsePaletteJson', () => {
  it('сообщает о битом JSON', () => {
    expect(parsePaletteJson('{oops')).toEqual({ ok: false, error: 'Файл не является корректным JSON' })
  })

  it('читает палитру из текста и возвращает её после serializePalette', () => {
    const parsed = parsePaletteJson(JSON.stringify(VALID))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsePaletteJson(serializePalette(parsed.palette))).toEqual(parsed)
  })
})

describe('isHexColor', () => {
  it('принимает только #rrggbb', () => {
    expect(isHexColor('#a1B2c3')).toBe(true)
    expect(isHexColor('#a1b2c')).toBe(false)
    expect(isHexColor('a1b2c3')).toBe(false)
  })
})
