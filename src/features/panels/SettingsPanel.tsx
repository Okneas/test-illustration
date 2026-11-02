import { FORMATS } from '@/features/scene/formats'
import { PRESET_PALETTES } from '@/features/palette/schemes'
import { useSceneStore } from '@/features/scene/store'
import { Label } from '@/shared/ui/label'
import { PaletteEditor } from './PaletteEditor'
import { PaletteSwatches } from './PaletteSwatches'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

/** Размер новых объектов, формат холста, цветовая схема и рисунок фона. */
export function SettingsPanel() {
  const format = useSceneStore((state) => state.format)
  const palette = useSceneStore((state) => state.palette)
  const showDecor = useSceneStore((state) => state.showDecor)
  const customPalette = useSceneStore((state) => state.customPalette)
  const setFormat = useSceneStore((state) => state.setFormat)
  const setPalette = useSceneStore((state) => state.setPalette)
  const setShowDecor = useSceneStore((state) => state.setShowDecor)

  return (
    <section aria-labelledby="settings-title" className="grid gap-4">
      <h2 id="settings-title" className="text-sm font-semibold">
        Настройки
      </h2>

      <div className="grid gap-1.5">
        <Label htmlFor="format-select">Формат холста</Label>
        <Select
          value={format.id}
          onValueChange={(value) => {
            const next = FORMATS.find((candidate) => candidate.id === value)
            if (next) setFormat(next)
          }}
        >
          <SelectTrigger id="format-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="palette-select">Цветовая схема</Label>
        <Select
          value={palette.id}
          onValueChange={(value) => {
            const next = [...PRESET_PALETTES, ...(customPalette ? [customPalette] : [])].find(
              (candidate) => candidate.id === value,
            )
            if (next) setPalette(next)
          }}
        >
          <SelectTrigger id="palette-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...PRESET_PALETTES, ...(customPalette ? [customPalette] : [])].map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <span className="flex items-center gap-2">
                  <PaletteSwatches palette={option} />
                  {option.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PaletteEditor />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showDecor}
          onChange={(event) => setShowDecor(event.target.checked)}
          className="size-4 accent-primary"
        />
        Рисунок фона
      </label>
    </section>
  )
}
