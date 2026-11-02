import { Dices, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { reassembleMetaphor, rearrange, relayout } from '@/features/compose/actions'
import { LAYOUT_MODES } from '@/features/compose/autoLayout'
import { LAYOUT_MODE_LABELS, useComposeStore } from '@/features/compose/store'
import { useSceneStore } from '@/features/scene/store'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { MetaphorDialog } from './MetaphorDialog'

/** Автосборка: по метафоре, режим раскладки, разнообразие и «подобрать заново». */
export function AssemblyControls() {
  const layoutMode = useComposeStore((state) => state.layoutMode)
  const lastAssembly = useComposeStore((state) => state.lastAssembly)
  const variety = useComposeStore((state) => state.variety)
  const setLayoutMode = useComposeStore((state) => state.setLayoutMode)
  const setVariety = useComposeStore((state) => state.setVariety)
  const hasObjects = useSceneStore((state) => state.objects.length > 0)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  const retry = async () => {
    setRetrying(true)
    setRetryError(null)
    try {
      await reassembleMetaphor()
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Не удалось подобрать заново')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <section aria-labelledby="assembly-title" className="grid gap-3">
      <h2 id="assembly-title" className="text-sm font-semibold">
        Автосборка
      </h2>
      <MetaphorDialog />

      <div className="grid gap-1.5">
        <Label htmlFor="layout-select">Раскладка</Label>
        <div className="flex gap-2">
          <Select
            value={layoutMode}
            onValueChange={(value) => {
              const next = LAYOUT_MODES.find((candidate) => candidate === value)
              if (!next) return
              setLayoutMode(next)
              if (hasObjects) void relayout()
            }}
          >
            <SelectTrigger id="layout-select" className="min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYOUT_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {LAYOUT_MODE_LABELS[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!hasObjects}
            aria-label="Другой вариант раскладки"
            title="Другой вариант раскладки"
            onClick={() => void rearrange()}
          >
            <Shuffle aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-1">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={variety}
            onChange={(event) => setVariety(event.target.checked)}
            className="size-4 accent-primary"
          />
          Разнообразить размеры и состояния
        </label>
        <p className="text-xs text-muted-foreground">
          При сборке по метафоре размер (S или L) и состояние (главный или фоновый) объектов выбираются случайно, но
          так, чтобы главные оставались главными. Выключите, чтобы все объекты были одного размера.
        </p>
      </div>

      {lastAssembly && (
        <div role="status" className="grid gap-2 rounded-lg bg-muted/50 p-2.5 text-xs">
          <div className="grid gap-1">
            <p>
              Подобрано ({lastAssembly.source === 'llm' ? `LLM: ${lastAssembly.via ?? 'модель'}` : 'локально'}):{' '}
              {lastAssembly.names.join(', ')}
            </p>
            {lastAssembly.notice && <p className="text-muted-foreground">{lastAssembly.notice}</p>}
          </div>
          <Button type="button" variant="outline" size="sm" disabled={retrying} onClick={() => void retry()}>
            <Dices aria-hidden="true" /> {retrying ? 'Подбираем…' : 'Подобрать заново'}
          </Button>
          {retryError && (
            <p role="alert" className="text-destructive">
              {retryError}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
