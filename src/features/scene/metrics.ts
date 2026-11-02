import { assetPath, loadAsset, type ObjectAssetKey } from '@/features/library/assets'
import { parseSvg } from '@/shared/lib/svg'

export type ObjectSize = { width: number; height: number }

const cache = new Map<string, Promise<ObjectSize>>()

/** Габариты объекта в единицах холста. Промис кэшируется, поэтому подходит для `use()`. */
export function loadObjectSize(key: ObjectAssetKey): Promise<ObjectSize> {
  const path = assetPath(key)
  const cached = cache.get(path)
  if (cached) return cached
  const promise = loadAsset(key).then((svg) => {
    const { width, height } = parseSvg(svg)
    return { width, height }
  })
  cache.set(path, promise)
  return promise
}
