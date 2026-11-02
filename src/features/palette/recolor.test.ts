import { describe, expect, it } from 'vitest'
import { collectPaints, recolorSvg } from './recolor'
import { PRESET_PALETTES, SOURCE_PALETTE } from './schemes'
import type { Palette } from './types'

const [violet, peach, mint] = PRESET_PALETTES

const SAMPLE = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="g"><path id="Vector" d="M0 0L10 10Z" fill="#D7CDF5"/>
<path d="M1 1L9 9Z" fill="#F9ECB0" fill-rule="evenodd"/>
<path d="M2 2L8 8Z" fill="#181817"/>
<path d="M3 3L7 7Z" fill="white"/>
<path d="M4 4L6 6Z" stroke="#7864D7" stroke-width="2" fill="none"/></g></svg>`

describe('recolorSvg', () => {
  it('подменяет fill и stroke по слотам палитры', () => {
    const result = recolorSvg(SAMPLE, violet, mint)
    expect(result).toContain('fill="#beebeb"') // фон 1: #D7CDF5 -> #beebeb
    expect(result).toContain('fill="#ffd4f2"') // объект 1: #F9ECB0 -> #ffd4f2
    expect(result).toContain('stroke="#5abebe"') // фон 3: #7864D7 -> #5abebe
  })

  it('не трогает чёрный, белый и none', () => {
    const result = recolorSvg(SAMPLE, violet, peach)
    expect(result).toContain('fill="#181817"')
    expect(result).toContain('fill="white"')
    expect(result).toContain('fill="none"')
  })

  it('не меняет ничего, кроме значений fill и stroke', () => {
    const normalize = (svg: string) => svg.replace(/(?<=\s)(fill|stroke)="[^"]*"/g, '$1=""')
    expect(normalize(recolorSvg(SAMPLE, violet, mint))).toBe(normalize(SAMPLE))
  })

  it('не путает fill-rule и stroke-width с красками', () => {
    const result = recolorSvg(SAMPLE, violet, mint)
    expect(result).toContain('fill-rule="evenodd"')
    expect(result).toContain('stroke-width="2"')
  })

  it('сравнивает цвета без учёта регистра', () => {
    const lower = SAMPLE.replace('#D7CDF5', '#d7cdf5')
    expect(recolorSvg(lower, violet, mint)).toContain('fill="#beebeb"')
  })

  it('перекраска в ту же палитру сохраняет набор цветов', () => {
    expect(collectPaints(recolorSvg(SAMPLE, violet, violet))).toEqual(collectPaints(SAMPLE))
  })

  it('красит фон от его собственной схемы, а не от схемы 1', () => {
    const peachBackground = '<svg width="1" height="1" viewBox="0 0 1 1"><rect fill="#fdd7b9"/><path stroke="#d27532" d="M0 0"/></svg>'
    const result = recolorSvg(peachBackground, peach, SOURCE_PALETTE)
    expect(result).toContain('fill="#d7cdf5"')
    expect(result).toContain('stroke="#7864d7"')
  })

  it('отказывается работать, если в палитре-источнике цвета повторяются', () => {
    const broken: Palette = { ...violet, id: 'broken', name: 'Сломанная', obj: [violet.bg[0], '#000001', '#000002'] }
    expect(() => recolorSvg(SAMPLE, broken, mint)).toThrow(/повторяющийся цвет/)
  })
})

describe('collectPaints', () => {
  it('собирает уникальные цвета в нижнем регистре и пропускает none', () => {
    expect([...collectPaints(SAMPLE)].sort()).toEqual(['#181817', '#7864d7', '#d7cdf5', '#f9ecb0', 'white'])
  })
})
