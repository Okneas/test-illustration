import { loadAsset } from '@/features/library/assets'
import { getLibraryObject, type LibraryObjectId } from '@/features/library/manifest'
import { loadObjectSize } from '@/features/scene/metrics'
import type { ObjectPatch } from '@/features/scene/sceneOps'
import { useSceneStore } from '@/features/scene/store'
import { assembleScene, measureItem, type AssemblyItem } from './assemble'
import { checkLlmConfig } from './llm/config'
import { useLlmStore } from './llmStore'
import { resolveMetaphor, type ResolveOutcome } from './resolve'
import { useComposeStore } from './store'
import { planAssembly } from './variation'

type Point = { x: number; y: number }

/**
 * Добавляет объект на холст главным, в размере новых объектов, центром в `center`
 * (без аргумента — в середину холста). Клик в библиотеке и перетаскивание на холст идут сюда.
 */
export async function addObjectToCanvas(objectId: LibraryObjectId, center?: Point): Promise<void> {
  const { defaultSize, format, addObject } = useSceneStore.getState()
  const { width, height } = await loadObjectSize({ kind: 'object', id: objectId, size: defaultSize, state: 'main' })
  const target = center ?? { x: format.width / 2, y: format.height / 2 }
  addObject(objectId, {
    state: 'main',
    size: defaultSize,
    position: { x: Math.round(target.x - width / 2), y: Math.round(target.y - height / 2) },
  })
}

/**
 * Меняет свойства объекта. Если меняется размер или состояние, новый файл подгружается до смены:
 * иначе объект на мгновение пропадал бы с холста, пока грузится его новый рисунок.
 */
export async function changeObject(instanceId: string, patch: ObjectPatch): Promise<void> {
  const object = useSceneStore.getState().objects.find((candidate) => candidate.instanceId === instanceId)
  if (!object) return
  if (patch.size !== undefined || patch.state !== undefined) {
    const next = { ...object, ...patch }
    // Если файла нет, ошибка всплывёт при отрисовке и будет показана границей ошибок холста.
    await loadAsset({ kind: 'object', id: object.objectId, size: next.size, state: next.state }).catch(() => undefined)
  }
  useSceneStore.getState().updateObject(instanceId, patch)
}

/** Заменяет композицию раскладкой выбранных объектов по текущему формату. */
export async function applyAssembly(items: readonly AssemblyItem[], seed?: number): Promise<void> {
  const { format, replaceObjects } = useSceneStore.getState()
  const { layoutMode, seed: currentSeed } = useComposeStore.getState()
  replaceObjects(
    await assembleScene({
      items,
      format,
      mode: layoutMode,
      seed: seed ?? currentSeed,
      measure: measureItem,
    }),
  )
}

type MetaphorOptions = {
  /** Номер варианта: 0 — самый вероятный набор, остальные дают другие. */
  variant?: number
  /** Готовый подбор: используется, чтобы не платить за новый запрос к LLM при «Подобрать заново». */
  reuse?: ResolveOutcome
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * Сценарий 1 целиком: подбор объектов (LLM или локально), выбор их размеров и состояний, раскладка
 * по холсту и запись итога для интерфейса. Бросает ошибку, если не удалось загрузить файлы библиотеки.
 */
export async function assembleByMetaphor(text: string, { variant = 0, reuse }: MetaphorOptions = {}): Promise<void> {
  const check = checkLlmConfig(useLlmStore.getState())
  const outcome =
    reuse ?? (await resolveMetaphor(text, { config: check.status === 'ready' ? check.config : null, variant }))

  // Ключ введён, но настройка неполная: LLM молча не включается, поэтому говорим почему.
  const incomplete = !reuse && check.status === 'incomplete' ? `LLM не использована: ${lowerFirst(check.reason)}.` : undefined
  const notice = [incomplete, outcome.notice].filter(Boolean).join(' ') || undefined

  const { defaultSize } = useSceneStore.getState()
  const { variety } = useComposeStore.getState()
  await applyAssembly(planAssembly(outcome.ids, { size: defaultSize, variety, variant, salt: text }), variant)

  useComposeStore.getState().setLastAssembly({
    text,
    ids: outcome.ids,
    names: outcome.ids.map((id) => getLibraryObject(id)?.name ?? id),
    source: outcome.source,
    via: outcome.via,
    notice,
    variant,
  })
}

/**
 * «Подобрать заново»: тот же запрос, следующий вариант. Локальный подбор выбирает другие объекты,
 * а набор от LLM остаётся прежним (новый запрос стоил бы денег), меняются размеры, состояния и раскладка.
 */
export async function reassembleMetaphor(): Promise<void> {
  const last = useComposeStore.getState().lastAssembly
  if (!last) return
  const reuse: ResolveOutcome | undefined =
    last.source === 'llm' ? { ids: last.ids, source: 'llm', via: last.via } : undefined
  await assembleByMetaphor(last.text, { variant: last.variant + 1, reuse })
}

function currentItems(): AssemblyItem[] {
  return useSceneStore.getState().objects.map(({ objectId, state, size }) => ({ objectId, state, size }))
}

/** Те же объекты (с их размерами) заново по выбранному режиму раскладки, тот же вариант. */
export async function relayout(): Promise<void> {
  const items = currentItems()
  if (items.length > 0) await applyAssembly(items)
}

/** Те же объекты, другая раскладка. */
export async function rearrange(): Promise<void> {
  const items = currentItems()
  if (items.length === 0) return
  await applyAssembly(items, useComposeStore.getState().nextSeed())
}
