import { create } from 'zustand'
import type { LibraryObjectId } from '@/features/library/manifest'
import type { ObjectState, Size } from '@/features/library/types'
import { PRESET_PALETTES } from '@/features/palette/schemes'
import type { Palette } from '@/features/palette/types'
import { DEFAULT_FORMAT } from './formats'
import {
  addObject,
  duplicateObject,
  moveLayer,
  moveLayerTo,
  removeObject,
  updateObject,
  type LayerMove,
  type ObjectPatch,
} from './sceneOps'
import type { CanvasObject, Format } from './types'

type AddObjectOptions = {
  state?: ObjectState
  /** По умолчанию — размер новых объектов из настроек. */
  size?: Size
  /** Левый верхний угол; по умолчанию — четверть формата. */
  position?: { x: number; y: number }
}

type SceneStore = {
  format: Format
  /** Размер, с которым добавляются новые объекты. У каждого объекта на холсте свой размер. */
  defaultSize: Size
  palette: Palette
  showDecor: boolean
  /** Порядок в массиве — порядок слоёв: первый внизу. */
  objects: CanvasObject[]
  selectedId: string | null

  setFormat: (format: Format) => void
  setDefaultSize: (size: Size) => void
  setPalette: (palette: Palette) => void
  /** Своя палитра (из файла или из редактора): запоминается, чтобы к ней можно было вернуться. */
  customPalette: Palette | null
  setCustomPalette: (palette: Palette) => void
  setShowDecor: (show: boolean) => void
  select: (instanceId: string | null) => void
  /** Добавляет объект на холст, выделяет его и возвращает id экземпляра. */
  addObject: (objectId: LibraryObjectId, options?: AddObjectOptions) => string
  /** Заменяет всю композицию (сценарии сборки). */
  replaceObjects: (objects: CanvasObject[]) => void
  removeObject: (instanceId: string) => void
  updateObject: (instanceId: string, patch: ObjectPatch) => void
  duplicateObject: (instanceId: string) => void
  moveLayer: (instanceId: string, move: LayerMove) => void
  /** Ставит слой на конкретное место в массиве (0 — самый нижний). */
  reorderLayer: (instanceId: string, toIndex: number) => void
  clear: () => void
}

const newInstanceId = () => crypto.randomUUID()

export const useSceneStore = create<SceneStore>()((set, get) => ({
  format: DEFAULT_FORMAT,
  defaultSize: 'L',
  palette: PRESET_PALETTES[0],
  showDecor: true,
  objects: [],
  selectedId: null,

  setFormat: (format) => set({ format }),
  setDefaultSize: (defaultSize) => set({ defaultSize }),
  setPalette: (palette) => set({ palette }),
  customPalette: null,
  setCustomPalette: (palette) => set({ palette, customPalette: palette }),
  setShowDecor: (showDecor) => set({ showDecor }),
  select: (selectedId) => set({ selectedId }),

  addObject: (objectId, { state = 'main', size, position } = {}) => {
    const instanceId = newInstanceId()
    const { format, objects, defaultSize } = get()
    const object: CanvasObject = {
      instanceId,
      objectId,
      state,
      size: size ?? defaultSize,
      rotation: 0,
      x: position?.x ?? Math.round(format.width / 4),
      y: position?.y ?? Math.round(format.height / 4),
    }
    set({ objects: addObject(objects, object), selectedId: instanceId })
    return instanceId
  },

  replaceObjects: (objects) => set({ objects, selectedId: null }),

  removeObject: (instanceId) =>
    set(({ objects, selectedId }) => ({
      objects: removeObject(objects, instanceId),
      selectedId: selectedId === instanceId ? null : selectedId,
    })),

  updateObject: (instanceId, patch) => set(({ objects }) => ({ objects: updateObject(objects, instanceId, patch) })),

  duplicateObject: (instanceId) => {
    const copyId = newInstanceId()
    set(({ objects }) => {
      const next = duplicateObject(objects, instanceId, copyId)
      return next.some((object) => object.instanceId === copyId) ? { objects: next, selectedId: copyId } : {}
    })
  },

  moveLayer: (instanceId, move) => set(({ objects }) => ({ objects: moveLayer(objects, instanceId, move) })),

  reorderLayer: (instanceId, toIndex) =>
    set(({ objects }) => ({ objects: moveLayerTo(objects, instanceId, toIndex) })),

  clear: () => set({ objects: [], selectedId: null }),
}))
