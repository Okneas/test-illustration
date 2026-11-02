import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Без `globals: true` RTL не чистит DOM между тестами сам.
afterEach(cleanup)

// В jsdom нет ResizeObserver, а слайдеру Radix он нужен при монтировании. Размеры в тестах нулевые,
// поэтому заглушки достаточно.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
