import type { CanvasObject } from './types'

export type LayerMove = 'forward' | 'backward' | 'front' | 'back'

export type ObjectPatch = Partial<Pick<CanvasObject, 'x' | 'y' | 'rotation' | 'state' | 'size'>>

/** Копия смещается, чтобы её было видно поверх оригинала. */
export const DUPLICATE_OFFSET = 40

export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0
  return ((degrees % 360) + 360) % 360
}

export function addObject(objects: readonly CanvasObject[], object: CanvasObject): CanvasObject[] {
  return [...objects, object]
}

export function removeObject(objects: readonly CanvasObject[], instanceId: string): CanvasObject[] {
  return objects.filter((object) => object.instanceId !== instanceId)
}

export function updateObject(
  objects: readonly CanvasObject[],
  instanceId: string,
  patch: ObjectPatch,
): CanvasObject[] {
  return objects.map((object) => {
    if (object.instanceId !== instanceId) return object
    const next = { ...object, ...patch }
    return { ...next, rotation: normalizeRotation(next.rotation) }
  })
}

/** Вставляет копию сразу над оригиналом, а не в конец стопки: слои остаются осмысленными. */
export function duplicateObject(
  objects: readonly CanvasObject[],
  instanceId: string,
  newInstanceId: string,
): CanvasObject[] {
  const index = objects.findIndex((object) => object.instanceId === instanceId)
  const original = objects[index]
  if (!original) return [...objects]
  const copy: CanvasObject = {
    ...original,
    instanceId: newInstanceId,
    x: original.x + DUPLICATE_OFFSET,
    y: original.y + DUPLICATE_OFFSET,
  }
  return [...objects.slice(0, index + 1), copy, ...objects.slice(index + 1)]
}

/** Ставит слой на конкретное место в массиве (0 — самый нижний). */
export function moveLayerTo(objects: readonly CanvasObject[], instanceId: string, toIndex: number): CanvasObject[] {
  const from = objects.findIndex((object) => object.instanceId === instanceId)
  const object = objects[from]
  if (!object) return [...objects]
  const to = Math.min(Math.max(Math.trunc(toIndex), 0), objects.length - 1)
  if (to === from) return [...objects]
  const rest = objects.filter((_, index) => index !== from)
  return [...rest.slice(0, to), object, ...rest.slice(to)]
}

/**
 * Список слоёв показан сверху вниз (верхний слой первый). Человек отпускает слой в «щель» между
 * строками: slot 0 — над первой строкой, slot `count` — под последней. Возвращает индекс в массиве
 * объектов, куда нужно поставить слой.
 */
export function arrayIndexForDrop(count: number, displayFrom: number, displaySlot: number): number {
  const displayTarget = displaySlot > displayFrom ? displaySlot - 1 : displaySlot
  return count - 1 - displayTarget
}

/** Порядок в массиве — порядок слоёв: первый внизу, последний сверху. */
export function moveLayer(objects: readonly CanvasObject[], instanceId: string, move: LayerMove): CanvasObject[] {
  const from = objects.findIndex((object) => object.instanceId === instanceId)
  const object = objects[from]
  if (!object) return [...objects]
  const last = objects.length - 1
  const to = {
    forward: Math.min(from + 1, last),
    backward: Math.max(from - 1, 0),
    front: last,
    back: 0,
  }[move]
  if (to === from) return [...objects]
  const rest = objects.filter((_, index) => index !== from)
  return [...rest.slice(0, to), object, ...rest.slice(to)]
}
