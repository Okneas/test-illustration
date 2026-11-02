import { describe, expect, it } from 'vitest'
import type { AssetKey } from '@/features/library/assets'
import { PRESET_PALETTES } from '@/features/palette/schemes'
import { FORMATS } from '@/features/scene/formats'
import type { CanvasObject, Scene } from '@/features/scene/types'
import { buildSceneSvg } from './buildSvg'

const [violet, , mint] = PRESET_PALETTES
const [square, wide] = FORMATS

function objectSvg(id: string, width: number, height: number) {
  return `<svg preserveAspectRatio="none" overflow="visible" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="&#208;&#156;"><path id="Vector" d="M0 0L${id.length} ${width}Z" fill="#D7CDF5"/><path id="Vector" d="M1 1L2 2Z" fill="#F9ECB0"/><path id="Vector" d="M3 3Z" fill="#181817"/></g></svg>`
}

const DECOR = `<svg width="1000" height="1000" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Фон"><rect id="r" width="1000" height="1000" fill="#D7CDF5"/><path d="M5 5L9 9" stroke="#7864D7"/></g></svg>`

const requested: AssetKey[] = []
const source = (key: AssetKey) => {
  requested.push(key)
  return key.kind === 'object' ? objectSvg(key.id, 200, 100) : DECOR
}

const object = (patch: Partial<CanvasObject> = {}): CanvasObject => ({
  instanceId: 'a',
  objectId: 'phone',
  x: 10,
  y: 20,
  rotation: 0,
  state: 'main',
  size: 'L',
  ...patch,
})

const scene = (patch: Partial<Scene> = {}): Scene => ({
  format: square,
  palette: violet,
  objects: [object({ objectId: 'book' }), object({ objectId: 'coin', x: 300, state: 'background' })],
  showDecor: true,
  ...patch,
})

const pathData = (svg: string) => [...svg.matchAll(/ d="([^"]*)"/g)].map((match) => match[1])

describe('buildSceneSvg', () => {
  it('задаёт размеры и viewBox по формату', () => {
    const svg = buildSceneSvg(scene({ format: wide }), source)
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">')).toBe(true)
  })

  it('кладёт слои по порядку: заливка, фон, объекты снизу вверх', () => {
    const svg = buildSceneSvg(scene(), source)
    const order = ['background-fill', 'background-decor', 'data-object="book"', 'data-object="coin"'].map((part) => svg.indexOf(part))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('запрашивает рисунок каждого объекта по его размеру и состоянию, а фон всегда из L', () => {
    requested.length = 0
    buildSceneSvg(
      scene({
        objects: [
          object({ objectId: 'book', size: 'S' }),
          object({ objectId: 'coin', size: 'L', state: 'background' }),
        ],
      }),
      source,
    )
    expect(requested).toContainEqual({ kind: 'object', id: 'book', size: 'S', state: 'main' })
    expect(requested).toContainEqual({ kind: 'object', id: 'coin', size: 'L', state: 'background' })
    expect(requested).toContainEqual({ kind: 'background', size: 'L', scheme: 1 })
    expect(requested).not.toContainEqual({ kind: 'background', size: 'S', scheme: 1 })
  })

  it('пишет размер каждого объекта в группу, чтобы S и L в одной сцене различались в файле', () => {
    const svg = buildSceneSvg(
      scene({ objects: [object({ objectId: 'book', size: 'S' }), object({ objectId: 'coin', size: 'L' })] }),
      source,
    )
    expect(svg).toMatch(/data-object="book"[^>]*data-size="S"/)
    expect(svg).toMatch(/data-object="coin"[^>]*data-size="L"/)
  })

  it('перекрашивает в палитру сцены', () => {
    const svg = buildSceneSvg(scene({ palette: mint }), source)
    expect(svg).toContain('fill="#ffd4f2"') // объект 1 мятной схемы вместо #F9ECB0
    expect(svg).not.toContain('#F9ECB0')
    expect(svg).toContain('fill="#181817"') // чёрный остаётся
    expect(svg).toContain('<rect id="background-fill" width="1000" height="1000" fill="#beebeb"/>')
  })

  it('не меняет геометрию: все d совпадают с исходными', () => {
    const svg = buildSceneSvg(scene(), source)
    const expected = [
      ...pathData(DECOR),
      ...pathData(objectSvg('book', 200, 100)),
      ...pathData(objectSvg('coin', 200, 100)),
    ]
    expect(pathData(svg)).toEqual(expected)
  })

  it('делает id уникальными и убирает искажённые имена слоёв из Figma', () => {
    const svg = buildSceneSvg(scene(), source)
    const ids = [...svg.matchAll(/ id="([^"]*)"/g)].map((match) => match[1])
    expect(new Set(ids).size).toBe(ids.length)
    expect(svg).not.toContain('&#208;')
  })

  it('сохраняет рабочий clipPath у фона и делает его id уникальным', () => {
    const clipped = `<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_24_6120)"><rect width="1000" height="1000" fill="#FDD7B9"/></g>
<defs><clipPath id="clip0_24_6120"><rect width="1000" height="1000" fill="white"/></clipPath></defs></svg>`
    const peachSource = (key: AssetKey) => (key.kind === 'background' ? clipped : objectSvg(key.id, 200, 100))
    const svg = buildSceneSvg(scene({ palette: PRESET_PALETTES[1] }), peachSource)
    expect(svg).toContain('clip-path="url(#background-decor-clip0_24_6120)"')
    expect(svg).toContain('<clipPath id="background-decor-clip0_24_6120">')
    const ids = [...svg.matchAll(/ id="([^"]*)"/g)].map((match) => match[1])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('пишет перенос и поворот вокруг центра объекта', () => {
    const plain = buildSceneSvg(scene({ objects: [object({ x: 10, y: 20 })] }), source)
    expect(plain).toContain('transform="translate(10 20)"')
    const rotated = buildSceneSvg(scene({ objects: [object({ x: 10, y: 20, rotation: 30 })] }), source)
    expect(rotated).toContain('transform="translate(10 20) rotate(30 100 50)"')
  })

  it('растягивает рисунок фона до покрытия формата и прижимает к правому нижнему углу', () => {
    // фон 1000×1000 на 1200×630: масштаб 1,2 → 1200×1200, виден нижний фрагмент высотой 630
    expect(buildSceneSvg(scene({ format: wide }), source)).toContain(
      '<g id="background-decor" transform="translate(0 -570) scale(1.2)">',
    )
    // на 800×1200: масштаб 1,2 → 1200×1200, виден правый фрагмент шириной 800
    expect(buildSceneSvg(scene({ format: FORMATS[2] }), source)).toContain(
      '<g id="background-decor" transform="translate(-400 0) scale(1.2)">',
    )
    expect(buildSceneSvg(scene({ format: square }), source)).toContain(
      '<g id="background-decor" transform="translate(0 0)">',
    )
  })


  it('не добавляет рисунок фона, если он выключен', () => {
    const svg = buildSceneSvg(scene({ showDecor: false }), source)
    expect(svg).not.toContain('background-decor')
  })

  it('остаётся векторным: без растра и вставок', () => {
    const svg = buildSceneSvg(scene(), source)
    for (const forbidden of ['<image', 'foreignObject', '<canvas', 'data:image']) {
      expect(svg).not.toContain(forbidden)
    }
  })

  it('даёт корректный XML', () => {
    const parsed = new DOMParser().parseFromString(buildSceneSvg(scene({ palette: mint }), source), 'image/svg+xml')
    expect(parsed.querySelector('parsererror')).toBeNull()
    expect(parsed.querySelectorAll('g[data-object]')).toHaveLength(2)
  })
})
