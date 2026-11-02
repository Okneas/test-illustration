import { cn } from 'cn'
import {
  Suspense,
  useDeferredValue,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { addObjectToCanvas } from '@/features/compose/actions'
import { LIBRARY_DRAG_TYPE } from '@/features/library/dnd'
import { isLibraryObjectId } from '@/features/library/manifest'
import { useSceneStore } from '@/features/scene/store'
import type { CanvasObject } from '@/features/scene/types'
import { Button } from '@/shared/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/shared/ui/context-menu'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { Decor } from './Decor'
import { screenToCanvas } from './geometry'
import { ObjectView } from './ObjectView'
import { SelectionFrame } from './SelectionFrame'

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  /** Единиц холста в одном пикселе экрана на момент начала перетаскивания. */
  unitsPerPixel: number
}

const KEY_STEP = 1
const KEY_STEP_LARGE = 10

function unitsPerPixel(svg: SVGSVGElement | null): number {
  const pixelsPerUnit = svg?.getScreenCTM()?.a
  return pixelsPerUnit && pixelsPerUnit > 0 ? 1 / pixelsPerUnit : 1
}

export function Canvas() {
  const format = useSceneStore((state) => state.format)
  // Смена схемы может подгрузить другой рисунок фона. Отложенное значение заставляет React держать
  // прежнюю картинку, пока всё не загрузится, вместо мерцания.
  const palette = useDeferredValue(useSceneStore((state) => state.palette))
  const showDecor = useSceneStore((state) => state.showDecor)
  const objects = useSceneStore((state) => state.objects)
  const selectedId = useSceneStore((state) => state.selectedId)
  const select = useSceneStore((state) => state.select)
  const updateObject = useSceneStore((state) => state.updateObject)
  const removeObject = useSceneStore((state) => state.removeObject)
  const duplicateObject = useSceneStore((state) => state.duplicateObject)
  const moveLayer = useSceneStore((state) => state.moveLayer)

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const selected = objects.find((object) => object.instanceId === selectedId)

  // Перетаскивание из библиотеки: данные при dragover недоступны, но тип виден.
  const isLibraryDrag = (event: DragEvent) => event.dataTransfer.types.includes(LIBRARY_DRAG_TYPE)

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isLibraryDrag(event)) return
    event.preventDefault() // без этого браузер не разрешит drop
    event.dataTransfer.dropEffect = 'copy'
    setDropActive(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // dragleave приходит и при переходе на дочерний элемент; сбрасываем, только если вышли за пределы.
    const next = event.relatedTarget
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) setDropActive(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    setDropActive(false)
    const objectId = event.dataTransfer.getData(LIBRARY_DRAG_TYPE)
    if (!isLibraryObjectId(objectId)) return
    event.preventDefault()
    const matrix = svgRef.current?.getScreenCTM()
    // Объект ложится центром в точку отпускания; вне холста (на поле вокруг) — тоже, как и при перетаскивании.
    void addObjectToCanvas(objectId, matrix ? screenToCanvas(matrix, event.clientX, event.clientY) : undefined)
  }

  const handlePointerDown = (event: PointerEvent<SVGGElement>, object: CanvasObject) => {
    if (event.button === 2) {
      select(object.instanceId) // правая кнопка: выбрать объект под курсором, меню откроется само
      return
    }
    if (event.button !== 0) return
    event.stopPropagation()
    select(object.instanceId)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: object.x,
      originY: object.y,
      unitsPerPixel: unitsPerPixel(svgRef.current),
    }
  }

  const handlePointerMove = (event: PointerEvent<SVGGElement>, object: CanvasObject) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    updateObject(object.instanceId, {
      x: Math.round(drag.originX + (event.clientX - drag.startX) * drag.unitsPerPixel),
      y: Math.round(drag.originY + (event.clientY - drag.startY) * drag.unitsPerPixel),
    })
  }

  const handlePointerEnd = () => {
    dragRef.current = null
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!selected) return
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    const nudge = (dx: number, dy: number) =>
      updateObject(selected.instanceId, { x: selected.x + dx * step, y: selected.y + dy * step })

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      duplicateObject(selected.instanceId)
    } else if (event.key === 'ArrowLeft') nudge(-1, 0)
    else if (event.key === 'ArrowRight') nudge(1, 0)
    else if (event.key === 'ArrowUp') nudge(0, -1)
    else if (event.key === 'ArrowDown') nudge(0, 1)
    else if (event.key === 'Delete' || event.key === 'Backspace') removeObject(selected.instanceId)
    else if (event.key === '[') moveLayer(selected.instanceId, 'backward')
    else if (event.key === ']') moveLayer(selected.instanceId, 'forward')
    else if (event.key === 'Escape') select(null)
    else return
    event.preventDefault()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          tabIndex={0}
          role="application"
          aria-label="Холст композиции. Стрелки двигают выбранный объект, Delete удаляет, Ctrl+D дублирует, скобки меняют слой, Escape снимает выделение"
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex h-full min-h-0 w-full items-center justify-center p-6 outline-none [container-type:size] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset',
            dropActive && 'bg-primary/5 ring-2 ring-primary/60 ring-inset',
          )}
        >
          <ErrorBoundary
            fallback={(error, reset) => (
              <div role="alert" className="flex flex-col items-center gap-3 text-center text-sm">
                <p>Не удалось отрисовать композицию: {error.message}</p>
                <Button type="button" variant="outline" onClick={reset}>
                  Повторить
                </Button>
              </div>
            )}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${format.width} ${format.height}`}
              overflow="visible"
              className="touch-none bg-white shadow-md"
              // Вписываем холст в область с сохранением пропорций формата: ширина — меньшее из
              // ширины области и ширины, которую допускает её высота.
              style={{
                width: `min(100cqw, calc(100cqh * ${format.width} / ${format.height}))`,
                aspectRatio: `${format.width} / ${format.height}`,
              }}
              onPointerDown={() => select(null)}
            >
              <defs>
                <clipPath id="canvas-clip">
                  <rect width={format.width} height={format.height} />
                </clipPath>
              </defs>
              <g clipPath="url(#canvas-clip)">
                <rect width={format.width} height={format.height} fill={palette.bg[0]} />
                {showDecor && (
                  <Suspense fallback={null}>
                    <Decor format={format} palette={palette} />
                  </Suspense>
                )}
                {objects.map((object) => (
                  <Suspense key={object.instanceId} fallback={null}>
                    <ObjectView
                      object={object}
                      palette={palette}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerEnd={handlePointerEnd}
                    />
                  </Suspense>
                ))}
              </g>
              {selected && (
                <Suspense fallback={null}>
                  <SelectionFrame object={selected} />
                </Suspense>
              )}
            </svg>
          </ErrorBoundary>
          {objects.length === 0 && (
            <p className="pointer-events-none absolute max-w-xs rounded-lg bg-background/85 px-4 py-3 text-center text-sm shadow-sm">
              Холст пуст. Добавьте объекты из библиотеки или соберите композицию по метафоре.
            </p>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem disabled={!selected} onSelect={() => selected && duplicateObject(selected.instanceId)}>
          Дублировать <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!selected} onSelect={() => selected && moveLayer(selected.instanceId, 'front')}>
          На передний план
        </ContextMenuItem>
        <ContextMenuItem disabled={!selected} onSelect={() => selected && moveLayer(selected.instanceId, 'forward')}>
          Выше <ContextMenuShortcut>]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!selected} onSelect={() => selected && moveLayer(selected.instanceId, 'backward')}>
          Ниже <ContextMenuShortcut>[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!selected} onSelect={() => selected && moveLayer(selected.instanceId, 'back')}>
          На задний план
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={!selected}
          onSelect={() => selected && removeObject(selected.instanceId)}
        >
          Удалить <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
