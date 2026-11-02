import type { LibraryObjectId } from './manifest'
import type { ObjectState, SchemeIndex, Size } from './types'

export type ObjectAssetKey = {
  kind: 'object'
  id: LibraryObjectId
  size: Size
  state: ObjectState
}

export type BackgroundAssetKey = {
  kind: 'background'
  size: Size
  scheme: SchemeIndex
}

export type AssetKey = ObjectAssetKey | BackgroundAssetKey

// Ленивая загрузка: каждый SVG — отдельный чанк, который тянется при первом использовании.
const modules = import.meta.glob<string>('/src/assets/library/**/*.svg', {
  query: '?raw',
  import: 'default',
})

const cache = new Map<string, Promise<string>>()

export function assetPath(key: AssetKey): string {
  return key.kind === 'object'
    ? `/src/assets/library/${key.size}/${key.state}/${key.id}.svg`
    : `/src/assets/library/backgrounds/${key.size}/scheme-${key.scheme}.svg`
}

export function hasAsset(key: AssetKey): boolean {
  return assetPath(key) in modules
}

/** Промис кэшируется по пути, поэтому его можно отдавать в `use()` из React. */
export function loadAsset(key: AssetKey): Promise<string> {
  const path = assetPath(key)
  const cached = cache.get(path)
  if (cached) return cached
  const importer = modules[path]
  const promise = importer
    ? importer()
    : Promise.reject(new Error(`В библиотеке нет файла ${path}`))
  cache.set(path, promise)
  return promise
}
