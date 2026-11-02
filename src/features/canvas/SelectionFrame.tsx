import { use } from 'react'
import { objectTransform } from '@/features/scene/markup'
import { loadObjectSize } from '@/features/scene/metrics'
import type { CanvasObject } from '@/features/scene/types'

type SelectionFrameProps = {
  object: CanvasObject
}

/** Пунктирная рамка вокруг выбранного объекта. В экспорт не попадает. */
export function SelectionFrame({ object }: SelectionFrameProps) {
  const { width, height } = use(
    loadObjectSize({ kind: 'object', id: object.objectId, size: object.size, state: object.state }),
  )
  return (
    <g transform={objectTransform(object, width, height)} pointerEvents="none">
      <rect
        width={width}
        height={height}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
        strokeDasharray="8 6"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}
