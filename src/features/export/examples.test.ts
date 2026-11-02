import { describe, expect, it } from 'vitest'

// Готовые примеры из папки examples (их собирает `npm run examples`).
const examples = import.meta.glob<string>('/examples/*.svg', { query: '?raw', import: 'default', eager: true })

describe('примеры композиций', () => {
  it('их не меньше трёх', () => {
    expect(Object.keys(examples).length).toBeGreaterThanOrEqual(3)
  })

  it.each(Object.entries(examples))('%s: корректный векторный SVG с объектами библиотеки', (_path, source) => {
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
    expect(doc.querySelector('parsererror')).toBeNull()

    const root = doc.documentElement
    expect(root.tagName).toBe('svg')
    expect(root.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/)

    expect(doc.querySelectorAll('g[data-object]').length).toBeGreaterThan(0)
    for (const forbidden of ['image', 'foreignObject', 'canvas', 'script', 'style']) {
      expect(doc.querySelector(forbidden)).toBeNull()
    }
    expect(source).not.toContain('data:image')

    // id уникальны: файл можно вставлять в другие документы без конфликтов.
    const ids = [...doc.querySelectorAll('[id]')].map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
