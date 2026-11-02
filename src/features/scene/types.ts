import type { LibraryObjectId } from '@/features/library/manifest'
import type { ObjectState, Size } from '@/features/library/types'
import type { Palette } from '@/features/palette/types'

export type Format = {
  id: string
  name: string
  width: number
  height: number
}

/**
 * Объект на холсте. Какой именно SVG показывать, определяют `size` и `state` самого объекта:
 * на одном холсте могут стоять и S-, и L-объекты. Масштаба нет намеренно: по заданию
 * пропорции объектов друг относительно друга менять нельзя.
 */
export type CanvasObject = {
  instanceId: string
  objectId: LibraryObjectId
  /** Левый верхний угол объекта до поворота, в координатах холста. */
  x: number
  y: number
  /** Градусы, поворот вокруг центра объекта. */
  rotation: number
  state: ObjectState
  size: Size
}

export type Scene = {
  format: Format
  palette: Palette
  /** Порядок в массиве = порядок слоёв: первый внизу. */
  objects: readonly CanvasObject[]
  showDecor: boolean
}
