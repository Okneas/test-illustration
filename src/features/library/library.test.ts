import { describe, expect, it } from 'vitest'
import { assetPath, hasAsset, loadAsset, type AssetKey, type BackgroundAssetKey, type ObjectAssetKey } from './assets'
import { LIBRARY_OBJECTS } from './manifest'
import { OBJECT_STATES, SIZES, type SchemeIndex } from './types'
import { collectPaints } from '@/features/palette/recolor'
import { getPresetPalette, SOURCE_PALETTE } from '@/features/palette/schemes'
import { parseSvg } from '@/shared/lib/svg'

const SCHEMES: SchemeIndex[] = [1, 2, 3]
// В объектах нет ничего, кроме путей: ни масок, ни фильтров, ни растра. Фонам разрешён clipPath:
// Figma обрезает их рисунок по рамке кадра.
const FORBIDDEN_IN_ALL = ['<image', '<style', '<script', 'foreignObject', '<mask', '<filter', 'Gradient', '<use', 'data:image', 'opacity']
const NEUTRAL = ['#181817', '#ffffff', 'white']

const objectKeys = LIBRARY_OBJECTS.flatMap((object) =>
  SIZES.flatMap((size) => OBJECT_STATES.map((state): ObjectAssetKey => ({ kind: 'object', id: object.id, size, state }))),
)
const backgroundKeys = SIZES.flatMap((size) => SCHEMES.map((scheme): BackgroundAssetKey => ({ kind: 'background', size, scheme })))
const allKeys: AssetKey[] = [...objectKeys, ...backgroundKeys]

const named = <T extends AssetKey>(keys: T[]) => keys.map((key) => [assetPath(key), key] as const)

describe('библиотека: полнота', () => {
  it('содержит 10 объектов × 2 состояния × 2 размера + 3 фона × 2 размера', () => {
    expect(LIBRARY_OBJECTS).toHaveLength(10)
    expect(allKeys).toHaveLength(46)
  })

  it('имеет SVG-файл для каждого варианта', () => {
    const missing = allKeys.filter((key) => !hasAsset(key)).map(assetPath)
    expect(missing).toEqual([])
  })
})

describe('библиотека: чистота файлов', () => {
  it.each(named(allKeys))('%s: только векторная разметка и корректный размер', async (_path, key) => {
    const svg = await loadAsset(key)
    const { width, height } = parseSvg(svg) // бросит, если viewBox не «0 0 width height»
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    for (const forbidden of FORBIDDEN_IN_ALL) expect(svg).not.toContain(forbidden)
    if (key.kind === 'object') expect(svg).not.toContain('clipPath')
  })

  it.each(named(objectKeys))('%s: цвета только из схемы 1 и нейтральные', async (_path, key) => {
    const allowed = new Set<string>([...SOURCE_PALETTE.bg, ...SOURCE_PALETTE.obj, ...NEUTRAL])
    const unknown = [...collectPaints(await loadAsset(key))].filter((color) => !allowed.has(color))
    expect(unknown).toEqual([])
  })

  it.each(named(objectKeys.filter((key) => key.state === 'background')))(
    '%s: фоновый объект не использует цвета объектов',
    async (_path, key) => {
      const objectColors = new Set<string>(SOURCE_PALETTE.obj)
      const used = [...collectPaints(await loadAsset(key))].filter((color) => objectColors.has(color))
      expect(used).toEqual([])
    },
  )

  it.each(named(backgroundKeys))('%s: цвета ровно своей схемы, без цветов объектов', async (_path, key) => {
    const palette = getPresetPalette(key.scheme)
    const colors = [...collectPaints(await loadAsset(key))].filter((color) => !NEUTRAL.includes(color))
    expect(new Set(colors)).toEqual(new Set(palette.bg))
  })
})
