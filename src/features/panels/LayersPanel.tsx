import { cn } from 'cn'
import { GripVertical } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { LAYER_DRAG_TYPE } from '@/features/library/dnd'
import { getLibraryObject } from '@/features/library/manifest'
import { arrayIndexForDrop } from '@/features/scene/sceneOps'
import { useSceneStore } from '@/features/scene/store'

const STATE_LABELS = { main: 'главный', background: 'фоновый' } as const

type DragState = {
  instanceId: string
  /** «Щель», в которую сейчас попадёт слой: 0 — над первой строкой, `count` — под последней. */
  slot: number
}

/**
 * Список слоёв сверху вниз: самый верхний объект первый. Строки можно перетаскивать, чтобы менять
 * порядок. Те же действия без мыши: кнопки «Выше/Ниже» в свойствах и клавиши [ и ] на холсте.
 */
export function LayersPanel() {
  const objects = useSceneStore((state) => state.objects)
  const selectedId = useSceneStore((state) => state.selectedId)
  const select = useSceneStore((state) => state.select)
  const reorderLayer = useSceneStore((state) => state.reorderLayer)
  const [drag, setDrag] = useState<DragState | null>(null)

  if (objects.length === 0) {
    return <p className="text-sm text-muted-foreground">Пока на холсте нет объектов.</p>
  }

  const layers = [...objects].reverse()

  const handleDragStart = (event: DragEvent<HTMLLIElement>, instanceId: string, index: number) => {
    event.dataTransfer.setData(LAYER_DRAG_TYPE, instanceId) // без данных Firefox не начнёт перетаскивание
    event.dataTransfer.effectAllowed = 'move'
    setDrag({ instanceId, slot: index })
  }

  const handleDragOver = (event: DragEvent<HTMLLIElement>, index: number) => {
    if (!drag) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const rect = event.currentTarget.getBoundingClientRect()
    const slot = event.clientY < rect.top + rect.height / 2 ? index : index + 1
    setDrag((current) => (current && current.slot !== slot ? { ...current, slot } : current))
  }

  const handleDrop = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault()
    if (!drag) return
    const from = layers.findIndex((layer) => layer.instanceId === drag.instanceId)
    if (from >= 0) reorderLayer(drag.instanceId, arrayIndexForDrop(layers.length, from, drag.slot))
    setDrag(null)
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">Перетащите слой, чтобы изменить порядок: сверху — ближе к зрителю.</p>
      <ol className="grid gap-1" aria-label="Слои композиции">
        {layers.map((layer, index) => {
          const selected = layer.instanceId === selectedId
          const dragging = drag?.instanceId === layer.instanceId
          const name = getLibraryObject(layer.objectId)?.name ?? layer.objectId
          return (
            <li
              key={layer.instanceId}
              draggable
              onDragStart={(event) => handleDragStart(event, layer.instanceId, index)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={handleDrop}
              onDragEnd={() => setDrag(null)}
              className={cn(
                'rounded-md',
                dragging && 'opacity-50',
                drag?.slot === index && 'shadow-[0_-2px_0_0_var(--color-primary)]',
                drag?.slot === layers.length && index === layers.length - 1 && 'shadow-[0_2px_0_0_var(--color-primary)]',
              )}
            >
              <div
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => select(layer.instanceId)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  select(layer.instanceId)
                }}
                className={cn(
                  'flex w-full cursor-grab items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing',
                  selected ? 'border-primary bg-accent' : 'bg-card hover:bg-muted',
                )}
              >
                <GripVertical aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {STATE_LABELS[layer.state]} · {layer.size}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
