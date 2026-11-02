import { CONCEPTS, type Concept } from './concepts'
import { LIBRARY_OBJECTS, type LibraryObjectId } from './manifest'

type LibraryEntry = (typeof LIBRARY_OBJECTS)[number]

/** Чем найден объект: по названию, по тегу или только по смыслу (словарь понятий). */
export type MatchKind = 'name' | 'tag' | 'concept'

export type SearchResult = {
  object: LibraryEntry
  score: number
  via: MatchKind
}

export type NameLookup = {
  /** Что ввёл пользователь. */
  query: string
  matches: SearchResult[]
  /** Есть ли совпадение по названию или тегу. Если нет, найденное лишь «похоже по смыслу». */
  exact: boolean
}

/** Нижний регистр, «ё» как «е», без знаков препинания. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Служебные слова ничего не говорят о теме и могли бы случайно совпасть с началом настоящих слов.
const STOPWORDS = new Set(
  [
    'и', 'в', 'во', 'на', 'с', 'со', 'к', 'ко', 'по', 'о', 'об', 'от', 'до', 'из', 'за', 'для', 'про', 'при',
    'без', 'над', 'под', 'или', 'а', 'но', 'что', 'как', 'это', 'этот', 'эта', 'то', 'же', 'ли', 'не', 'ни',
    'бы', 'его', 'ее', 'их', 'мой', 'наш', 'ваш', 'быть', 'есть', 'будет', 'так', 'уже', 'еще', 'все', 'всё',
  ].map((word) => word.replaceAll('ё', 'е')),
)

function words(text: string): string[] {
  const normalized = normalizeText(text)
  return normalized ? normalized.split(' ').filter((word) => !STOPWORDS.has(word)) : []
}

/**
 * Слова считаются одинаковыми, если почти целиком совпадает начало: «телефоны» = «телефон»,
 * «кошелька» = «кошелёк», но «лампа» ≠ «ламинат». Окончания по падежам этим и отсекаются.
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true
  const shortest = Math.min(a.length, b.length)
  let prefix = 0
  while (prefix < shortest && a[prefix] === b[prefix]) prefix += 1
  return prefix >= Math.max(3, Math.min(4, shortest - 1), shortest - 2)
}

const NAME_MATCH = 6
const TAG_MATCH = 3

// Слова понятий разбираются заранее: составные («тайм-менеджмент») разбиваются на слова.
const CONCEPT_INDEX = CONCEPTS.map((concept) => {
  const objects: Concept['objects'] = concept.objects
  return { words: concept.words.flatMap(words), objects: Object.entries(objects) as [LibraryObjectId, number][] }
})

/** Веса объектов для одного слова запроса: берётся самая сильная связь из всех подходящих понятий. */
function conceptWeights(queryWord: string): Map<LibraryObjectId, number> {
  const weights = new Map<LibraryObjectId, number>()
  for (const concept of CONCEPT_INDEX) {
    if (!concept.words.some((word) => sameWord(queryWord, word))) continue
    for (const [id, weight] of concept.objects) {
      if (weight > (weights.get(id) ?? 0)) weights.set(id, weight)
    }
  }
  return weights
}

const KIND_PRIORITY: Record<MatchKind, number> = { concept: 0, tag: 1, name: 2 }

function scoreObject(
  object: LibraryEntry,
  queryWords: readonly string[],
  conceptsByWord: readonly Map<LibraryObjectId, number>[],
): { score: number; via: MatchKind } | null {
  const nameWords = words(object.name)
  const tagWords = object.tags.flatMap(words)
  let score = 0
  let via: MatchKind | null = null
  const note = (kind: MatchKind) => {
    if (via === null || KIND_PRIORITY[kind] > KIND_PRIORITY[via]) via = kind
  }

  queryWords.forEach((word, index) => {
    if (nameWords.some((nameWord) => sameWord(word, nameWord))) {
      score += NAME_MATCH
      note('name')
    } else if (tagWords.some((tagWord) => sameWord(word, tagWord))) {
      score += TAG_MATCH
      note('tag')
    }
    const concept = conceptsByWord[index]?.get(object.id) ?? 0
    if (concept > 0) {
      score += concept
      note('concept')
    }
  })

  return via === null ? null : { score, via }
}

/**
 * Объекты, подходящие под запрос, от самых подходящих. Название весит больше тега, тег больше
 * смысловой связи; каждое слово запроса может добавить очки по нескольким признакам сразу.
 */
export function searchObjects(query: string): SearchResult[] {
  const queryWords = words(query)
  if (queryWords.length === 0) return []
  const conceptsByWord = queryWords.map(conceptWeights)
  const results: SearchResult[] = []
  for (const object of LIBRARY_OBJECTS) {
    const scored = scoreObject(object, queryWords, conceptsByWord)
    if (scored) results.push({ object, ...scored })
  }
  return results.sort((a, b) => b.score - a.score)
}

/** Сценарий 2: «Телефон, лампа; книга» → по одному поиску на каждое название. */
export function lookupByNames(input: string): NameLookup[] {
  return input
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((query) => {
      const matches = searchObjects(query)
      return { query, matches, exact: matches[0] !== undefined && matches[0].via !== 'concept' }
    })
}
