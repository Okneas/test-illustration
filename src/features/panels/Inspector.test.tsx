import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSceneStore } from '@/features/scene/store'
import type { CanvasObject } from '@/features/scene/types'
import { Inspector } from './Inspector'

const make = (instanceId: string, patch: Partial<CanvasObject> = {}): CanvasObject => ({
  instanceId,
  objectId: 'coin',
  x: 10,
  y: 20,
  rotation: 0,
  state: 'main',
  size: 'L',
  ...patch,
})

describe('Inspector: размер и состояние объекта', () => {
  beforeEach(() => {
    useSceneStore.setState(useSceneStore.getInitialState(), true)
    useSceneStore.setState({ objects: [make('a'), make('b', { objectId: 'book' })], selectedId: 'a' })
  })

  it('показывает текущий размер выбранного объекта', () => {
    render(<Inspector />)
    expect(screen.getByRole('button', { name: 'L: крупный' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'S: мелкий' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('меняет размер только выбранного объекта и сохраняет его положение', async () => {
    render(<Inspector />)
    await userEvent.click(screen.getByRole('button', { name: 'S: мелкий' }))

    await waitFor(() => expect(useSceneStore.getState().objects[0]?.size).toBe('S'))
    const [coin, book] = useSceneStore.getState().objects
    expect(coin).toMatchObject({ instanceId: 'a', size: 'S', x: 10, y: 20 })
    expect(book?.size).toBe('L') // соседний объект остался в своём размере
  })

  it('на одном холсте уживаются S и L', async () => {
    render(<Inspector />)
    await userEvent.click(screen.getByRole('button', { name: 'S: мелкий' }))
    await waitFor(() => expect(useSceneStore.getState().objects[0]?.size).toBe('S'))
    expect(new Set(useSceneStore.getState().objects.map((object) => object.size))).toEqual(new Set(['S', 'L']))
  })

  it('меняет состояние объекта', async () => {
    render(<Inspector />)
    await userEvent.click(screen.getByRole('button', { name: 'Фоновый' }))
    await waitFor(() => expect(useSceneStore.getState().objects[0]?.state).toBe('background'))
  })
})
