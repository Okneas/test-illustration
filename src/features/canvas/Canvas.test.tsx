import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LIBRARY_DRAG_TYPE } from '@/features/library/dnd'
import { useSceneStore } from '@/features/scene/store'
import { fireDrag } from '@/test/dragEvents'
import { Canvas } from './Canvas'

// jsdom не считает раскладку, поэтому подставляем матрицу: холст 1000 единиц показан в 500 px,
// левый верхний угол на экране в (100, 40).
const matrix = { a: 0.5, b: 0, c: 0, d: 0.5, e: 100, f: 40 }
const original = Object.getOwnPropertyDescriptor(SVGSVGElement.prototype, 'getScreenCTM')

const dropData = (objectId: string) => ({
  types: [LIBRARY_DRAG_TYPE],
  getData: (type: string) => (type === LIBRARY_DRAG_TYPE ? objectId : ''),
  dropEffect: '',
})

describe('Canvas: перетаскивание из библиотеки', () => {
  beforeEach(() => {
    useSceneStore.setState(useSceneStore.getInitialState(), true)
    Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', { value: () => matrix, configurable: true })
  })

  afterEach(() => {
    if (original) Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', original)
    else Reflect.deleteProperty(SVGSVGElement.prototype, 'getScreenCTM')
  })

  it('кладёт объект центром в точку отпускания', async () => {
    render(<Canvas />)
    const area = screen.getByRole('application')

    // Экранная точка (350, 290) → координаты холста (500, 500).
    fireDrag('drop', area, { dataTransfer: dropData('coin'), clientX: 350, clientY: 290 })

    await waitFor(() => expect(useSceneStore.getState().objects).toHaveLength(1))
    expect(useSceneStore.getState().objects[0]).toMatchObject({
      objectId: 'coin',
      state: 'main',
      size: 'L',
      x: Math.round(500 - 286.677 / 2),
      y: Math.round(500 - 188.501 / 2),
    })
  })

  it('учитывает, куда именно отпустили', async () => {
    render(<Canvas />)
    // Экранная точка (100, 40) — левый верхний угол холста (0, 0): центр объекта там.
    fireDrag('drop', screen.getByRole('application'), { dataTransfer: dropData('coin'), clientX: 100, clientY: 40 })

    await waitFor(() => expect(useSceneStore.getState().objects).toHaveLength(1))
    expect(useSceneStore.getState().objects[0]).toMatchObject({
      x: Math.round(-286.677 / 2),
      y: Math.round(-188.501 / 2),
    })
  })

  it('игнорирует чужие данные и неизвестные id', () => {
    render(<Canvas />)
    const area = screen.getByRole('application')
    fireDrag('drop', area, { dataTransfer: dropData('dragon'), clientX: 350, clientY: 290 })
    fireDrag('drop', area, { dataTransfer: { types: ['text/plain'], getData: () => 'coin' }, clientX: 350, clientY: 290 })
    expect(useSceneStore.getState().objects).toHaveLength(0)
  })

  it('разрешает drop только для объектов библиотеки', () => {
    render(<Canvas />)
    const area = screen.getByRole('application')
    // false означает, что обработчик вызвал preventDefault, то есть drop разрешён.
    expect(fireDrag('dragOver', area, { dataTransfer: dropData('coin') })).toBe(false)
    expect(fireDrag('dragOver', area, { dataTransfer: { types: ['text/plain'] } })).toBe(true)
  })
})
