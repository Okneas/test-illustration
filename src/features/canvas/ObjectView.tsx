import { use, useMemo, type PointerEvent } from 'react'
import { loadAsset } from '@/features/library/assets'
import type { Palette } from '@/features/palette/types'
import { objectTransform, prepareObject } from '@/features/scene/markup'
import type { CanvasObject } from '@/features/scene/types'

type ObjectViewProps = {
  object: CanvasObject
  palette: Palette
  onPointerDown: (event: PointerEvent<SVGGElement>, object: CanvasObject) => void
  onPointerMove: (event: PointerEvent<SVGGElement>, object: CanvasObject) => void
  onPointerEnd: (event: PointerEvent<SVGGElement>) => void
}

/**
 * Один объект на холсте. Разметку берём из файла библиотеки по размеру и состоянию самого объекта
 * и красим в палитру сцены тем же кодом, что и экспорт, поэтому на экране ровно то, что попадёт в SVG.
 */
export function ObjectView({ object, palette, onPointerDown, onPointerMove, onPointerEnd }: ObjectViewProps) {
  const source = use(loadAsset({ kind: 'object', id: object.objectId, size: object.size, state: object.state }))
  // Перекраска дорогая (десятки килобайт), а при перетаскивании меняется только transform.
  const { width, height, inner } = useMemo(
    () => prepareObject(source, palette, object.instanceId),
    [source, palette, object.instanceId],
  )

  return (
    <g
      transform={objectTransform(object, width, height)}
      data-object={object.objectId}
      data-state={object.state}
      data-size={object.size}
      className="cursor-grab active:cursor-grabbing"
      onPointerDown={(event) => onPointerDown(event, object)}
      onPointerMove={(event) => onPointerMove(event, object)}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      // Источник — наши собственные файлы библиотеки; в палитру попадают только проверенные #rrggbb.
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  )
}
