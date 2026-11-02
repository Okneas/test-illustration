import { Download, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { downloadText } from '@/features/export/download'
import { isHexColor, parsePaletteJson, serializePalette } from '@/features/palette/paletteIO'
import { listSlots, withSlotColor } from '@/features/palette/slots'
import { useSceneStore } from '@/features/scene/store'
import { Button } from '@/shared/ui/button'

/** Файл палитры — это шесть цветов; всё, что больше, точно не палитра. */
export const MAX_PALETTE_FILE_BYTES = 100_000

/** Загрузка палитры из JSON и ручная правка шести слотов; композиция перекрашивается сразу. */
export function PaletteEditor() {
  const palette = useSceneStore((state) => state.palette)
  const setCustomPalette = useSceneStore((state) => state.setCustomPalette)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // чтобы можно было выбрать тот же файл ещё раз
    if (!file) return
    if (file.size > MAX_PALETTE_FILE_BYTES) {
      setError('Файл слишком большой для палитры')
      return
    }
    const result = parsePaletteJson(await file.text())
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setCustomPalette(result.palette)
  }

  return (
    <details className="rounded-lg border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Своя палитра</summary>
      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          {listSlots(palette).map(({ slot, label, color }) => (
            <label key={slot} className="grid gap-1 text-xs">
              {label}
              <input
                type="color"
                value={color}
                onChange={(event) => {
                  if (isHexColor(event.target.value)) setCustomPalette(withSlotColor(palette, slot, event.target.value))
                }}
                className="h-8 w-full cursor-pointer rounded border bg-transparent p-0.5"
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            <Upload aria-hidden="true" /> Загрузить
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadText('palette.json', serializePalette(palette), 'application/json')}
          >
            <Download aria-hidden="true" /> Скачать
          </Button>
        </div>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="application/json,.json"
          aria-label="Файл палитры в формате JSON"
          onChange={(event) => void handleFile(event)}
        />

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          JSON вида <code>{'{"name": "…", "bg": [3 цвета], "obj": [3 цвета]}'}</code>, цвета в формате #rrggbb. Цвета
          фона допустимы в объектах, цвета объектов — только в объектах, поэтому слоты разделены.
        </p>
      </div>
    </details>
  )
}
