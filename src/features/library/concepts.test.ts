import { describe, expect, it } from 'vitest'
import { COMPANIONS, CONCEPTS, UNIVERSAL_OBJECTS } from './concepts'
import { isLibraryObjectId, LIBRARY_OBJECTS } from './manifest'
import { normalizeText } from './search'

describe('словарь смыслов', () => {
  it('у каждого понятия уникальный id, достаточно слов и хотя бы один объект', () => {
    const ids = CONCEPTS.map((concept) => concept.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const concept of CONCEPTS) {
      expect(concept.words.length, concept.id).toBeGreaterThanOrEqual(8)
      expect(Object.keys(concept.objects).length, concept.id).toBeGreaterThan(0)
    }
  })

  it('связывает только с существующими объектами и весами от 1 до 3', () => {
    for (const concept of CONCEPTS) {
      for (const [id, weight] of Object.entries(concept.objects)) {
        expect(isLibraryObjectId(id), `${concept.id}: ${id}`).toBe(true)
        expect([1, 2, 3], `${concept.id}: ${id}`).toContain(weight)
      }
    }
  })

  it('слова записаны единообразно: без пробелов и заглавных', () => {
    for (const concept of CONCEPTS) {
      for (const word of concept.words) {
        expect(word, concept.id).toBe(word.toLowerCase())
        expect(word, concept.id).not.toMatch(/\s/)
      }
    }
  })

  it('не содержит слов-ловушек, которые дали бы случайные совпадения в любом заголовке', () => {
    const trap = new Set(['новый', 'время', 'день', 'часть', 'эко', 'бот', 'год', 'месяц', 'путь', 'вопрос', 'ответ'])
    for (const concept of CONCEPTS) {
      for (const word of concept.words) {
        expect(trap.has(normalizeText(word)), `${concept.id}: «${word}»`).toBe(false)
      }
    }
  })

  it('каждый объект библиотеки иллюстрирует не меньше шести понятий, и сильная связь есть у каждого', () => {
    for (const { id } of LIBRARY_OBJECTS) {
      const related = CONCEPTS.filter((concept) => (concept.objects as Record<string, number>)[id] !== undefined)
      expect(related.length, id).toBeGreaterThanOrEqual(6)
      expect(
        related.some((concept) => (concept.objects as Record<string, number>)[id] === 3),
        `у «${id}» нет понятия с весом 3`,
      ).toBe(true)
    }
  })
})

describe('спутники и универсальный набор', () => {
  it('у каждого объекта есть спутники, это существующие объекты и не он сам', () => {
    for (const { id } of LIBRARY_OBJECTS) {
      const companions: readonly string[] = COMPANIONS[id]
      expect(companions.length, id).toBeGreaterThanOrEqual(3)
      expect(companions, id).not.toContain(id)
      expect(new Set(companions).size, id).toBe(companions.length)
      for (const companion of companions) expect(isLibraryObjectId(companion), `${id}: ${companion}`).toBe(true)
    }
  })

  it('универсальный набор состоит из существующих объектов без повторов', () => {
    expect(UNIVERSAL_OBJECTS.length).toBeGreaterThanOrEqual(5)
    expect(new Set(UNIVERSAL_OBJECTS).size).toBe(UNIVERSAL_OBJECTS.length)
    for (const id of UNIVERSAL_OBJECTS) expect(isLibraryObjectId(id)).toBe(true)
  })
})
