import { COMPANIONS, UNIVERSAL_OBJECTS } from '@/features/library/concepts'
import type { LibraryObjectId } from '@/features/library/manifest'
import { normalizeText, searchObjects } from '@/features/library/search'
import type { Size } from '@/features/library/types'
import { createRandom, hashString } from '@/shared/lib/random'
import { chooseStates, type AssemblyItem } from './assemble'

/** Сколько объектов берём в варианте №0: достаточно для композиции, но без каши. */
export const DEFAULT_COUNT = 4
const MIN_COUNT = 3
const MAX_COUNT = 5

/**
 * В «пул» попадают объекты, набравшие не меньше этой доли очков лучшего. Порог низкий: настоящее
 * совпадение, пусть и слабое, должно идти раньше «спутников», которых запрос вообще не упоминал.
 */
const POOL_RATIO = 0.25
const POOL_LIMIT = 7

/** Доля объектов, которые в разнообразном варианте остаются главными. */
const MAIN_SHARE = 0.65
/** Вероятность взять не тот размер, что в настройках: у главных реже, у фоновых чаще. */
const OTHER_SIZE_MAIN = 0.3
const OTHER_SIZE_BACKGROUND = 0.5
const MIN_MAIN = 2

/** Зерно из текста запроса и номера варианта: тот же запрос и вариант всегда дают тот же результат. */
function seedFor(text: string, variant: number, salt = 0): number {
  return (hashString(normalizeText(text)) + Math.imul(variant + 1, 0x9e3779b1) + salt) >>> 0
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[result[index], result[other]] = [result[other] as T, result[index] as T]
  }
  return result
}

/** Выбирает индекс с вероятностью, пропорциональной весу. */
function weightedIndex(weights: readonly number[], random: () => number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let threshold = random() * total
  for (let index = 0; index < weights.length; index += 1) {
    threshold -= weights[index] ?? 0
    if (threshold < 0) return index
  }
  return weights.length - 1
}

/**
 * Подбор объектов под метафору без LLM. Берёт лучшие совпадения (по названию, тегам и смыслу) и,
 * если их мало, добирает логичных «спутников» — предметы, которые хорошо смотрятся рядом.
 *
 * Вариант 0 — самый вероятный набор из четырёх объектов. Варианты 1 и больше выбирают из тех же
 * сильных кандидатов случайно (с перевесом в пользу более подходящих) и меняют число объектов.
 * Возвращает пустой список, если ни одно слово запроса не нашлось.
 */
export function pickForMetaphor(text: string, variant = 0): LibraryObjectId[] {
  const ranked = searchObjects(text)
  const best = ranked[0]
  if (!best) return []

  const random = createRandom(seedFor(text, variant))
  const count = variant === 0 ? DEFAULT_COUNT : MIN_COUNT + Math.floor(random() * (MAX_COUNT - MIN_COUNT + 1))
  const pool = ranked.filter((result) => result.score >= best.score * POOL_RATIO).slice(0, POOL_LIMIT)

  const chosen: LibraryObjectId[] = [best.object.id]
  const rest = pool.slice(1)
  while (chosen.length < count && rest.length > 0) {
    const index = variant === 0 ? 0 : weightedIndex(rest.map((result) => result.score), random)
    const [next] = rest.splice(index, 1)
    if (next) chosen.push(next.object.id)
  }

  // Мало совпадений — добираем спутниками уже выбранных объектов.
  for (let anchor = 0; chosen.length < count && anchor < chosen.length; anchor += 1) {
    const anchorId = chosen[anchor]
    if (!anchorId) break
    const companions = variant === 0 ? [...COMPANIONS[anchorId]] : shuffled(COMPANIONS[anchorId], random)
    for (const companion of companions) {
      if (chosen.length >= count) break
      if (!chosen.includes(companion)) chosen.push(companion)
    }
  }
  return chosen
}

/**
 * Универсальный набор, когда запрос не удалось связать ни с чем. Состав зависит от текста и варианта,
 * поэтому разные заголовки не получают одну и ту же подборку.
 */
export function pickUniversal(text: string, variant = 0): LibraryObjectId[] {
  const random = createRandom(seedFor(text, variant, 1))
  return shuffled(UNIVERSAL_OBJECTS, random).slice(0, DEFAULT_COUNT)
}

type PlanOptions = {
  /** Размер из настроек: от него отсчитывается разнообразие. */
  size: Size
  /** Выключено — как раньше: первые три главные, остальные фоновые, все одного размера. */
  variety: boolean
  variant?: number
  /** Текст запроса: от него зависит случайность, поэтому у разных запросов разные наборы свойств. */
  salt?: string
}

/**
 * Превращает подборку в элементы композиции. С разнообразием состояние и размер каждого объекта
 * выбираются случайно (но воспроизводимо): первый, самый подходящий объект всегда главный, главных
 * не меньше двух, а размер чаще остаётся тем, что в настройках.
 */
export function planAssembly(ids: readonly LibraryObjectId[], { size, variety, variant = 0, salt = '' }: PlanOptions): AssemblyItem[] {
  const unique = [...new Set(ids)]
  if (!variety) return chooseStates(unique, size)

  const random = createRandom(seedFor(salt, variant, 2))
  const otherSize: Size = size === 'L' ? 'S' : 'L'
  const drafts = unique.map((objectId, index) => {
    const main = index === 0 || random() < MAIN_SHARE
    const useOtherSize = random() < (main ? OTHER_SIZE_MAIN : OTHER_SIZE_BACKGROUND)
    return { objectId, main, size: useOtherSize ? otherSize : size }
  })

  // Композиция из одних фоновых объектов выглядела бы пустой: возвращаем главные по порядку.
  let missingMain = Math.min(MIN_MAIN, drafts.length) - drafts.filter((draft) => draft.main).length
  return drafts.map((draft) => {
    const promote = !draft.main && missingMain > 0
    if (promote) missingMain -= 1
    return { objectId: draft.objectId, size: draft.size, state: draft.main || promote ? 'main' : 'background' }
  })
}
