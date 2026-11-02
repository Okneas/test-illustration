import { Canvas } from '@/features/canvas/Canvas'
import { useSceneStore } from '@/features/scene/store'
import { AssemblyControls } from '@/features/panels/AssemblyControls'
import { ExportButton } from '@/features/panels/ExportButton'
import { Inspector } from '@/features/panels/Inspector'
import { LayersPanel } from '@/features/panels/LayersPanel'
import { LibraryPanel } from '@/features/panels/LibraryPanel'
import { SettingsPanel } from '@/features/panels/SettingsPanel'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export function App() {
  const clear = useSceneStore((state) => state.clear)
  const isEmpty = useSceneStore((state) => state.objects.length === 0)

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30 text-foreground lg:h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2">
        <h1 className="text-base font-semibold">Конструктор иллюстраций</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={isEmpty} onClick={clear}>
            Очистить
          </Button>
          <ExportButton />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          aria-label="Панель управления"
          className="grid content-start gap-4 border-b bg-background p-4 lg:w-100 lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          <SettingsPanel />
          <Separator />
          <AssemblyControls />
          <Separator />
          <Tabs defaultValue="library">
            <TabsList className="w-full">
              <TabsTrigger value="library">Библиотека</TabsTrigger>
              <TabsTrigger value="layers">Слои</TabsTrigger>
            </TabsList>
            <TabsContent value="library" className="pt-3">
              <LibraryPanel />
            </TabsContent>
            <TabsContent value="layers" className="pt-3">
              <LayersPanel />
            </TabsContent>
          </Tabs>
        </aside>

        {/* На узких экранах холст идёт первым: иначе его не видно за длинной панелью настроек. */}
        <main className="order-first h-[60dvh] min-w-0 shrink-0 lg:order-none lg:h-auto lg:flex-1 lg:shrink">
          <Canvas />
        </main>

        <aside
          aria-label="Свойства объекта"
          className="border-t bg-background p-4 lg:w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l"
        >
          <Inspector />
        </aside>
      </div>
    </div>
  )
}
