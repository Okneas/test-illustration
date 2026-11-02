import { ChevronsDown, ChevronsUp, Copy, Trash2 } from 'lucide-react'
import { changeObject } from '@/features/compose/actions'
import { getLibraryObject } from '@/features/library/manifest'
import type { ObjectState, Size } from '@/features/library/types'
import { useSceneStore } from '@/features/scene/store'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { NumberField } from '@/shared/ui/NumberField'
import { Slider } from '@/shared/ui/slider'

const STATE_OPTIONS: readonly { value: ObjectState; label: string }[] = [
  { value: 'main', label: 'Главный' },
  { value: 'background', label: 'Фоновый' },
]

const SIZE_OPTIONS: readonly { value: Size; label: string }[] = [
  { value: 'S', label: 'S: мелкий' },
  { value: 'L', label: 'L: крупный' },
]

type SegmentedProps<T extends string> = {
  id: string
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

/** Переключатель из нескольких кнопок; выбранная нажата (`aria-pressed`). */
function Segmented<T extends string>({ id, label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="grid gap-1.5">
      <Label id={id}>{label}</Label>
      <div role="group" aria-labelledby={id} className="grid grid-cols-2 gap-1.5">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={option.value === value ? 'default' : 'outline'}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** Свойства выбранного объекта: положение, поворот, состояние, размер, слои. */
export function Inspector() {
  const object = useSceneStore((state) => state.objects.find((item) => item.instanceId === state.selectedId))
  const updateObject = useSceneStore((state) => state.updateObject)
  const duplicateObject = useSceneStore((state) => state.duplicateObject)
  const removeObject = useSceneStore((state) => state.removeObject)
  const moveLayer = useSceneStore((state) => state.moveLayer)

  if (!object) {
    return (
      <section aria-labelledby="inspector-title" className="grid gap-2">
        <h2 id="inspector-title" className="text-sm font-semibold">
          Свойства
        </h2>
        <p className="text-sm text-muted-foreground">
          Выберите объект на холсте или в списке слоёв, чтобы изменить положение, поворот, состояние и размер.
        </p>
      </section>
    )
  }

  const { instanceId } = object
  const name = getLibraryObject(object.objectId)?.name ?? object.objectId

  return (
    <section aria-labelledby="inspector-title" className="grid gap-4">
      <h2 id="inspector-title" className="text-sm font-semibold">
        Свойства: {name}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <NumberField id="object-x" label="X" value={object.x} onCommit={(x) => updateObject(instanceId, { x })} />
        <NumberField id="object-y" label="Y" value={object.y} onCommit={(y) => updateObject(instanceId, { y })} />
      </div>

      <div className="grid gap-2">
        <NumberField
          id="object-rotation"
          label="Поворот, °"
          value={object.rotation}
          onCommit={(rotation) => updateObject(instanceId, { rotation })}
        />
        <Slider
          aria-label="Поворот объекта"
          min={0}
          max={360}
          step={1}
          value={[object.rotation]}
          onValueChange={([rotation]) => {
            if (rotation !== undefined) updateObject(instanceId, { rotation })
          }}
        />
      </div>

      <Segmented
        id="state-label"
        label="Состояние"
        value={object.state}
        options={STATE_OPTIONS}
        onChange={(state) => void changeObject(instanceId, { state })}
      />

      <Segmented
        id="size-label"
        label="Размер"
        value={object.size}
        options={SIZE_OPTIONS}
        onChange={(size) => void changeObject(instanceId, { size })}
      />

      <div className="grid gap-1.5">
        <Label id="layer-label">Порядок слоёв</Label>
        <div role="group" aria-labelledby="layer-label" className="grid grid-cols-2 gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={() => moveLayer(instanceId, 'front')}>
            <ChevronsUp aria-hidden="true" /> На передний
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => moveLayer(instanceId, 'back')}>
            <ChevronsDown aria-hidden="true" /> На задний
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => moveLayer(instanceId, 'forward')}>
            Выше
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => moveLayer(instanceId, 'backward')}>
            Ниже
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button type="button" variant="outline" onClick={() => duplicateObject(instanceId)}>
          <Copy aria-hidden="true" /> Дублировать
        </Button>
        <Button type="button" variant="destructive" onClick={() => removeObject(instanceId)}>
          <Trash2 aria-hidden="true" /> Удалить
        </Button>
      </div>
    </section>
  )
}
