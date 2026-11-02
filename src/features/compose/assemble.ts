import type { LibraryObjectId } from '@/features/library/manifest'
import type { ObjectState, Size } from '@/features/library/types'
import { loadObjectSize, type ObjectSize } from '@/features/scene/metrics'
import type { CanvasObject, Format } from '@/features/scene/types'
import { layoutComposition, type LayoutMode } from './autoLayout'

export type AssemblyItem = { objectId: LibraryObjectId; state: ObjectState; size: Size }

/** Габариты объекта; в приложении читаются из файла библиотеки, в тестах подменяются. */
export type Measure = (item: AssemblyItem) => Promise<ObjectSize>

/** Сколько объектов в подборке делаем главными: остальные уходят на задний план как фоновые. */
export const MAIN_LIMIT = 3

export const measureItem: Measure = ({ objectId, state, size }) =>
  loadObjectSize({ kind: 'object', id: objectId, size, state })

/** Первые объекты подборки — главные, остальные — фоновые; повторы убираются. */
export function chooseStates(ids: readonly LibraryObjectId[], size: Size, mainLimit = MAIN_LIMIT): AssemblyItem[] {
  return [...new Set(ids)].map((objectId, index) => ({
    objectId,
    size,
    state: index < mainLimit ? 'main' : 'background',
  }))
}

type AssembleOptions = {
  items: readonly AssemblyItem[]
  format: Pick<Format, 'width' | 'height'>
  mode: LayoutMode
  /** 0 — без случайности; другое число даёт другой вариант раскладки. */
  seed?: number
  measure: Measure
  createId?: () => string
}

/**
 * Расставляет объекты по формату. Слои как в примерах Figma: фоновые объекты лежат под главными,
 * а внутри каждой группы крупные под мелкими, чтобы мелкий объект не пропадал за крупным.
 */
export async function assembleScene({
  items,
  format,
  mode,
  seed = 0,
  measure,
  createId = () => crypto.randomUUID(),
}: AssembleOptions): Promise<CanvasObject[]> {
  const measured = await Promise.all(items.map(async (item) => ({ item, size: await measure(item) })))
  const layer = (state: ObjectState) =>
    measured
      .filter((entry) => entry.item.state === state)
      .sort((a, b) => b.size.width * b.size.height - a.size.width * a.size.height)
  const ordered = [...layer('background'), ...layer('main')]

  const positions = layoutComposition(
    ordered.map((entry) => entry.size),
    format,
    mode,
    seed,
  )
  return ordered.map(({ item }, index) => ({
    instanceId: createId(),
    objectId: item.objectId,
    state: item.state,
    size: item.size,
    rotation: 0,
    x: positions[index]?.x ?? 0,
    y: positions[index]?.y ?? 0,
  }))
}
