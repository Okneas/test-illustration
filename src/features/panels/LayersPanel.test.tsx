import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LAYER_DRAG_TYPE } from '@/features/library/dnd'
import type { LibraryObjectId } from '@/features/library/manifest'
import { useSceneStore } from '@/features/scene/store'
import type { CanvasObject } from '@/features/scene/types'
import { fireDrag } from '@/test/dragEvents'
import { LayersPanel } from './LayersPanel'

const make = (objectId: LibraryObjectId, patch: Partial<CanvasObject> = {}): CanvasObject => ({
  instanceId: objectId,
  objectId,
  x: 0,
  y: 0,
  rotation: 0,
  state: 'main',
  size: 'L',
  ...patch,
})

const ids = () => useSceneStore.getState().objects.map((object) => object.objectId)
const dataTransfer = () => ({ setData: () => undefined, effectAllowed: '', dropEffect: '', types: [LAYER_DRAG_TYPE] })

function rows() {
  return within(screen.getByRole('list', { name: 'Слои композиции' })).getAllByRole('listitem')
}

/** Перетаскивает строку `from` на строку `to`; `half` — в верхнюю (`top`) или нижнюю (`bottom`) половину. */
function dragRow(from: number, to: number, half: 'top' | 'bottom') {
  const list = rows()
  const transfer = dataTransfer()
  const source = list[from]
  const target = list[to]
  if (!source || !target) throw new Error('нет такой строки')
  fireDrag('dragStart', source, { dataTransfer: transfer })
  // В jsdom размеры нулевые: середина строки — 0, поэтому clientY -1 это верхняя половина, 1 — нижняя.
  fireDrag('dragOver', target, { dataTransfer: transfer, clientY: half === 'top' ? -1 : 1 })
  fireDrag('drop', target, { dataTransfer: transfer })
  fireDrag('dragEnd', source)
}

describe('LayersPanel', () => {
  beforeEach(() => {
    useSceneStore.setState(useSceneStore.getInitialState(), true)
    // Снизу вверх: книга, монета, ручка. В списке сверху вниз: ручка, монета, книга.
    useSceneStore.setState({ objects: [make('book'), make('coin'), make('pen')] })
  })

  it('показывает слои сверху вниз с состоянием и размером', () => {
    render(<LayersPanel />)
    expect(rows().map((row) => row.textContent)).toEqual([
      'Ручкаглавный · L',
      'Монетаглавный · L',
      'Книгаглавный · L',
    ])
  })

  it('делает строки перетаскиваемыми', () => {
    render(<LayersPanel />)
    for (const row of rows()) expect(row).toHaveAttribute('draggable', 'true')
  })

  it('переносит верхний слой вниз: ручка под книгу', () => {
    render(<LayersPanel />)
    dragRow(0, 2, 'bottom')
    expect(ids()).toEqual(['pen', 'book', 'coin']) // снизу вверх; сверху вниз: монета, книга, ручка
    expect(rows().map((row) => row.textContent?.replace(/главный · L/, ''))).toEqual(['Монета', 'Книга', 'Ручка'])
  })

  it('переносит нижний слой наверх: книга над ручкой', () => {
    render(<LayersPanel />)
    dragRow(2, 0, 'top')
    expect(ids()).toEqual(['coin', 'pen', 'book'])
  })

  it('переносит слой в середину', () => {
    render(<LayersPanel />)
    dragRow(0, 1, 'bottom') // ручку под монету
    expect(ids()).toEqual(['book', 'pen', 'coin'])
  })

  it('оставляет порядок, если отпустить слой на прежнее место', () => {
    render(<LayersPanel />)
    dragRow(1, 1, 'top')
    dragRow(1, 1, 'bottom')
    expect(ids()).toEqual(['book', 'coin', 'pen'])
  })

  it('не трогает порядок, если drop пришёл не от слоя этого списка', () => {
    render(<LayersPanel />)
    const target = rows()[1]
    if (!target) throw new Error('нет строки')
    fireDrag('drop', target, { dataTransfer: { types: ['text/plain'] } })
    expect(ids()).toEqual(['book', 'coin', 'pen'])
  })

  it('по клику выбирает слой', () => {
    render(<LayersPanel />)
    fireEvent.click(within(rows()[1] as HTMLElement).getByRole('button'))
    expect(useSceneStore.getState().selectedId).toBe('coin')
  })
})
