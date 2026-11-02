import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LIBRARY_DRAG_TYPE } from '@/features/library/dnd'
import { useSceneStore } from '@/features/scene/store'
import { LibraryPanel } from './LibraryPanel'

// Размеры монеты L из библиотеки: 286,677 × 188,501. Центр квадратного холста 1000×1000 — (500, 500).
const COIN_L_CENTERED = { x: Math.round(500 - 286.677 / 2), y: Math.round(500 - 188.501 / 2) }

describe('LibraryPanel', () => {
  beforeEach(() => {
    useSceneStore.setState(useSceneStore.getInitialState(), true)
  })

  it('показывает карточки без кнопок «Главный» и «Фоновый»', () => {
    render(<LibraryPanel />)
    expect(screen.getAllByRole('button', { name: /^Добавить «.+» на холст$/ })).toHaveLength(10)
    expect(screen.queryByRole('button', { name: 'Главный' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Фоновый' })).toBeNull()
  })

  it('по клику кладёт объект главным в середину холста', async () => {
    render(<LibraryPanel />)
    await userEvent.click(screen.getByRole('button', { name: 'Добавить «Монета» на холст' }))

    await waitFor(() => expect(useSceneStore.getState().objects).toHaveLength(1))
    expect(useSceneStore.getState().objects[0]).toMatchObject({
      objectId: 'coin',
      state: 'main',
      size: 'L',
      ...COIN_L_CENTERED,
    })
  })

  it('кладёт в середину и при другом формате, и в выбранном размере новых объектов', async () => {
    useSceneStore.setState({ defaultSize: 'S', format: { id: 'wide', name: 'wide', width: 1200, height: 630 } })
    render(<LibraryPanel />)
    await userEvent.click(screen.getByRole('button', { name: 'Добавить «Монета» на холст' }))

    await waitFor(() => expect(useSceneStore.getState().objects).toHaveLength(1))
    const [coin] = useSceneStore.getState().objects
    expect(coin?.size).toBe('S')
    // Монета S: 152,391 × 100,202.
    expect(coin).toMatchObject({ x: Math.round(600 - 152.391 / 2), y: Math.round(315 - 100.202 / 2) })
  })

  it('добавляет объект и с клавиатуры (Enter)', async () => {
    render(<LibraryPanel />)
    screen.getByRole('button', { name: 'Добавить «Монета» на холст' }).focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(useSceneStore.getState().objects).toHaveLength(1))
  })

  it('при перетаскивании отдаёт холсту id объекта', () => {
    render(<LibraryPanel />)
    const card = screen.getByRole('button', { name: 'Добавить «Монета» на холст' })
    expect(card).toHaveAttribute('draggable', 'true')

    const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
    fireEvent.dragStart(card, { dataTransfer })
    expect(dataTransfer.setData).toHaveBeenCalledWith(LIBRARY_DRAG_TYPE, 'coin')
    expect(dataTransfer.effectAllowed).toBe('copy')
  })

  it('в результатах поиска карточки работают так же', async () => {
    render(<LibraryPanel />)
    await userEvent.type(screen.getByLabelText('Найти по названию'), 'монета')
    const section = screen.getByRole('region', { name: 'Результаты для «монета»' })
    await userEvent.click(within(section).getByRole('button', { name: 'Добавить «Монета» на холст' }))
    await waitFor(() => expect(useSceneStore.getState().objects).toHaveLength(1))
  })

  it('честно помечает объекты, найденные только по смыслу', async () => {
    render(<LibraryPanel />)
    await userEvent.type(screen.getByLabelText('Найти по названию'), 'компьютер')
    const section = screen.getByRole('region', { name: 'Результаты для «компьютер»' })
    expect(within(section).getByText(/Такого объекта нет\. Похоже по смыслу/)).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'Добавить «Телефон» на холст' })).toBeInTheDocument()
  })

  it('не помечает точные совпадения как «похожие»', async () => {
    render(<LibraryPanel />)
    await userEvent.type(screen.getByLabelText('Найти по названию'), 'телефон')
    expect(screen.queryByText(/Похоже по смыслу/)).toBeNull()
  })

  it('в композицию из найденного берёт только точные совпадения, но не «похожие»', async () => {
    render(<LibraryPanel />)
    await userEvent.type(screen.getByLabelText('Найти по названию'), 'лампа, компьютер')
    await userEvent.click(screen.getByRole('button', { name: 'Собрать композицию из найденного' }))

    await waitFor(() => expect(useSceneStore.getState().objects).toHaveLength(1))
    expect(useSceneStore.getState().objects[0]?.objectId).toBe('lamp') // телефон «по смыслу» не добавился
  })

  it('кнопка сборки недоступна, если точных совпадений нет', async () => {
    render(<LibraryPanel />)
    await userEvent.type(screen.getByLabelText('Найти по названию'), 'компьютер')
    expect(screen.getByRole('button', { name: 'Собрать композицию из найденного' })).toBeDisabled()
  })
})
