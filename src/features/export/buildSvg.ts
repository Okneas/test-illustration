import { assetPath, loadAsset, type AssetKey } from '@/features/library/assets'
import { getDecorScheme } from '@/features/palette/schemes'
import { DECOR_SIZE, decorTransform, objectTransform, prepareDecor, prepareObject } from '@/features/scene/markup'
import type { Scene } from '@/features/scene/types'

/** Откуда брать исходный SVG: в браузере — загруженные файлы библиотеки, в тестах — заглушки. */
export type SvgSource = (key: AssetKey) => string

/**
 * Собирает итоговый векторный SVG: заливка фона, рисунок фона и группы объектов в порядке слоёв.
 * Содержимое объектов — исходные пути из библиотеки, изменены только fill/stroke и id.
 */
export function buildSceneSvg(scene: Scene, source: SvgSource): string {
  const { format, palette } = scene
  const layers: string[] = [
    `<rect id="background-fill" width="${format.width}" height="${format.height}" fill="${palette.bg[0]}"/>`,
  ]

  if (scene.showDecor) {
    const scheme = getDecorScheme(palette)
    const decor = prepareDecor(
      source({ kind: 'background', size: DECOR_SIZE, scheme }),
      scheme,
      palette,
      'background-decor',
    )
    layers.push(`<g id="background-decor" transform="${decorTransform(format, decor)}">${decor.inner}</g>`)
  }

  scene.objects.forEach((object, index) => {
    const id = `object-${index + 1}`
    const { width, height, inner } = prepareObject(
      source({ kind: 'object', id: object.objectId, size: object.size, state: object.state }),
      palette,
      id,
    )
    layers.push(
      `<g id="${id}" data-object="${object.objectId}" data-state="${object.state}" data-size="${object.size}" ` +
        `transform="${objectTransform(object, width, height)}">${inner}</g>`,
    )
  })

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${format.width}" height="${format.height}" ` +
    `viewBox="0 0 ${format.width} ${format.height}">\n${layers.join('\n')}\n</svg>\n`
  )
}

/** Загружает нужные файлы библиотеки и собирает SVG сцены. */
export async function exportSceneSvg(scene: Scene): Promise<string> {
  const keys: AssetKey[] = scene.objects.map((object) => ({
    kind: 'object',
    id: object.objectId,
    size: object.size,
    state: object.state,
  }))
  if (scene.showDecor) {
    keys.push({ kind: 'background', size: DECOR_SIZE, scheme: getDecorScheme(scene.palette) })
  }
  const loaded = new Map<string, string>()
  await Promise.all(
    keys.map(async (key) => {
      loaded.set(assetPath(key), await loadAsset(key))
    }),
  )
  return buildSceneSvg(scene, (key) => {
    const svg = loaded.get(assetPath(key))
    if (svg === undefined) throw new Error('Файл библиотеки не был загружен перед сборкой')
    return svg
  })
}
