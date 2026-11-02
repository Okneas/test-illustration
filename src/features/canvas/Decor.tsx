import { use, useMemo } from 'react'
import { loadAsset } from '@/features/library/assets'
import { getDecorScheme } from '@/features/palette/schemes'
import type { Palette } from '@/features/palette/types'
import { DECOR_SIZE, decorTransform, prepareDecor } from '@/features/scene/markup'
import type { Format } from '@/features/scene/types'

type DecorProps = {
  format: Format
  palette: Palette
}

/** Рисунок фона из библиотеки (линии, конфетти, тень в углу) поверх заливки цветом схемы. */
export function Decor({ format, palette }: DecorProps) {
  const scheme = getDecorScheme(palette)
  const source = use(loadAsset({ kind: 'background', size: DECOR_SIZE, scheme }))
  const decor = useMemo(() => prepareDecor(source, scheme, palette, 'canvas-decor'), [source, scheme, palette])

  return (
    <g
      transform={decorTransform(format, decor)}
      pointerEvents="none"
      // Источник — наш файл библиотеки; в палитру попадают только проверенные #rrggbb.
      dangerouslySetInnerHTML={{ __html: decor.inner }}
    />
  )
}
