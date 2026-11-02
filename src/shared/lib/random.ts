/**
 * Детерминированный генератор (mulberry32): одно и то же зерно даёт одну и ту же последовательность.
 * Нужен, чтобы «другой вариант» был воспроизводимым и тестируемым, а не зависел от Math.random.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Хеш строки (FNV-1a, 32 бита): превращает текст запроса в зерно. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
