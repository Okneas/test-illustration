import { Download } from 'lucide-react'
import { useState } from 'react'
import { downloadSvg } from '@/features/export/download'
import { exportSceneSvg } from '@/features/export/buildSvg'
import { useSceneStore } from '@/features/scene/store'
import { Button } from '@/shared/ui/button'

export function ExportButton() {
  const isEmpty = useSceneStore((state) => state.objects.length === 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setBusy(true)
    setError(null)
    try {
      const { format, palette, objects, showDecor } = useSceneStore.getState()
      const svg = await exportSceneSvg({ format, palette, objects, showDecor })
      downloadSvg(`composition-${format.width}x${format.height}.svg`, svg)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось собрать SVG')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="button" disabled={isEmpty || busy} onClick={() => void handleExport()}>
        <Download aria-hidden="true" /> Экспорт SVG
      </Button>
    </div>
  )
}
