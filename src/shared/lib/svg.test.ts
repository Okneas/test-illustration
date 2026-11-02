import { describe, expect, it } from 'vitest'
import { parseSvg, scopeIds } from './svg'

const FIGMA_STYLE = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="286.677" height="188.501" viewBox="0 0 286.677 188.501" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="&#208;&#156;"><path id="Vector" d="M1 1L2 2Z" fill="#F9ECB0"/></g>
</svg>
`

describe('parseSvg', () => {
  it('читает размеры и содержимое выгрузки Figma', () => {
    const parsed = parseSvg(FIGMA_STYLE)
    expect(parsed.width).toBe(286.677)
    expect(parsed.height).toBe(188.501)
    expect(parsed.inner.startsWith('<g id=')).toBe(true)
    expect(parsed.inner.endsWith('</g>')).toBe(true)
  })

  it('отклоняет не-SVG', () => {
    expect(() => parseSvg('<div></div>')).toThrow(/нет корневого элемента/)
  })

  it('отклоняет SVG, у которого viewBox не совпадает с размерами: иначе объект сместится или сожмётся', () => {
    const shifted = FIGMA_STYLE.replace('viewBox="0 0 286.677 188.501"', 'viewBox="10 0 286.677 188.501"')
    expect(() => parseSvg(shifted)).toThrow(/viewBox/)
    const scaled = FIGMA_STYLE.replace('viewBox="0 0 286.677 188.501"', 'viewBox="0 0 100 100"')
    expect(() => parseSvg(scaled)).toThrow(/viewBox/)
  })

  it('отклоняет SVG без размеров', () => {
    expect(() => parseSvg('<svg viewBox="0 0 1 1"></svg>')).toThrow(/width\/height/)
  })
})

describe('scopeIds', () => {
  it('убирает id, на которые нет ссылок, и не трогает геометрию и цвета', () => {
    const result = scopeIds(parseSvg(FIGMA_STYLE).inner, 'o1')
    expect(result).not.toContain('id=')
    expect(result).toContain('d="M1 1L2 2Z"')
    expect(result).toContain('fill="#F9ECB0"')
  })

  it('оставляет рабочими ссылки на clipPath, добавляя префикс и к id, и к url(#…)', () => {
    const markup =
      '<g clip-path="url(#clip0_24_6120)"><rect id="r" width="5"/></g><defs><clipPath id="clip0_24_6120"><rect width="5"/></clipPath></defs>'
    const result = scopeIds(markup, 'bg')
    expect(result).toContain('clip-path="url(#bg-clip0_24_6120)"')
    expect(result).toContain('<clipPath id="bg-clip0_24_6120">')
    expect(result).not.toContain('id="r"')
  })

  it('даёт разным префиксам разные id для одинаковых файлов', () => {
    const markup = '<g clip-path="url(#c)"/><clipPath id="c"/>'
    expect(scopeIds(markup, 'a')).not.toBe(scopeIds(markup, 'b'))
  })
})
