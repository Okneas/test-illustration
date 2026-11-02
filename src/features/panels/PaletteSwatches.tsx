import type { Palette } from '@/features/palette/types'

/** Полоска из шести цветов палитры для списков выбора. */
export function PaletteSwatches({ palette }: { palette: Palette }) {
  return (
    <span aria-hidden="true" className="flex">
      {[...palette.bg, ...palette.obj].map((color, index) => (
        <span key={index} className="size-3 first:rounded-l-sm last:rounded-r-sm" style={{ background: color }} />
      ))}
    </span>
  )
}
