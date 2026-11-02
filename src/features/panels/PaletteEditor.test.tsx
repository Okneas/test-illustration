import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSceneStore } from '@/features/scene/store'
import { MAX_PALETTE_FILE_BYTES, PaletteEditor } from './PaletteEditor'

const VALID = JSON.stringify({
  name: 'Закат',
  bg: ['#FFE0D0', '#FFB090', '#C05030'],
  obj: ['#FFF0A0', '#A0E0D0', '#E0F8F0'],
})

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('нет поля выбора файла')
  return input
}

describe('PaletteEditor', () => {
  beforeEach(() => {
    useSceneStore.setState(useSceneStore.getInitialState(), true)
  })

  it('применяет палитру из файла и запоминает её как свою', async () => {
    const { container } = render(<PaletteEditor />)
    await userEvent.upload(fileInput(container), new File([VALID], 'sunset.json', { type: 'application/json' }))

    const { palette, customPalette } = useSceneStore.getState()
    expect(palette).toMatchObject({ id: 'custom', name: 'Закат', bg: ['#ffe0d0', '#ffb090', '#c05030'] })
    expect(customPalette).toEqual(palette)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('показывает ошибку для битого файла и не меняет палитру', async () => {
    const before = useSceneStore.getState().palette
    const { container } = render(<PaletteEditor />)
    await userEvent.upload(fileInput(container), new File(['{oops'], 'bad.json', { type: 'application/json' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Файл не является корректным JSON')
    expect(useSceneStore.getState().palette).toBe(before)
  })

  it('отклоняет слишком большой файл', async () => {
    const before = useSceneStore.getState().palette
    const { container } = render(<PaletteEditor />)
    const huge = new File(['x'.repeat(MAX_PALETTE_FILE_BYTES + 1)], 'huge.json', { type: 'application/json' })
    await userEvent.upload(fileInput(container), huge)

    expect(await screen.findByRole('alert')).toHaveTextContent('слишком большой')
    expect(useSceneStore.getState().palette).toBe(before)
  })

  it('превращает готовую схему в свою при ручной правке цвета', () => {
    render(<PaletteEditor />)
    fireEvent.change(screen.getByLabelText('Фон 1'), { target: { value: '#112233' } })

    const { palette } = useSceneStore.getState()
    expect(palette.id).toBe('custom')
    expect(palette.bg[0]).toBe('#112233')
    expect(palette.bg[1]).toBe('#aa9bf0') // остальные цвета схемы не тронуты
  })
})
