import { use, useMemo } from 'react'
import type { LibraryObjectId } from '@/features/library/manifest'
import { loadAsset } from '@/features/library/assets'
import type { ObjectState, Size } from '@/features/library/types'
import type { Palette } from '@/features/palette/types'
import { prepareObject } from '@/features/scene/markup'

type ObjectThumbnailProps = {
  objectId: LibraryObjectId
  size: Size
  state: ObjectState
  palette: Palette
}

/** Превью объекта библиотеки в текущем размере и палитре; тот же код, что на холсте. */
export function ObjectThumbnail({ objectId, size, state, palette }: ObjectThumbnailProps) {
  const source = use(loadAsset({ kind: 'object', id: objectId, size, state }))
  const { width, height, inner } = useMemo(
    () => prepareObject(source, palette, `thumb-${objectId}-${state}`),
    [source, palette, objectId, state],
  )
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="size-full" aria-hidden="true">
      {/* Источник — наши файлы библиотеки; в палитру попадают только проверенные #rrggbb. */}
      <g dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  )
}
