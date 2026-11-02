import { Suspense, useDeferredValue, useState, type KeyboardEvent } from "react";
import { addObjectToCanvas, applyAssembly } from "@/features/compose/actions";
import { LIBRARY_DRAG_TYPE } from "@/features/library/dnd";
import type { LibraryObjectId } from "@/features/library/manifest";
import { LIBRARY_OBJECTS } from "@/features/library/manifest";
import { lookupByNames } from "@/features/library/search";
import { useSceneStore } from "@/features/scene/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ObjectThumbnail } from "./ObjectThumbnail";

type ObjectCardProps = {
  object: { id: LibraryObjectId; name: string };
};

/** Карточка объекта: клик кладёт его в центр холста, перетаскивание — туда, куда отпустили. */
function ObjectCard({ object }: ObjectCardProps) {
  const size = useDeferredValue(useSceneStore((state) => state.defaultSize));
  const palette = useDeferredValue(useSceneStore((state) => state.palette));
  const add = () => void addObjectToCanvas(object.id);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    add();
  };

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        draggable
        aria-label={`Добавить «${object.name}» на холст`}
        onClick={add}
        onKeyDown={handleKeyDown}
        onDragStart={(event) => {
          event.dataTransfer.setData(LIBRARY_DRAG_TYPE, object.id);
          event.dataTransfer.effectAllowed = "copy";
        }}
        className="grid cursor-grab gap-2 rounded-lg border bg-card p-2 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-muted/40 p-2">
          <Suspense
            fallback={
              <div className="size-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            }
          >
            <ObjectThumbnail
              objectId={object.id}
              size={size}
              state="main"
              palette={palette}
            />
          </Suspense>
        </div>
        <p className="text-sm font-medium">{object.name}</p>
      </div>
    </li>
  );
}

/** Сценарий 2: названия объектов через запятую → найденные объекты → композиция. */
export function LibraryPanel() {
  const [query, setQuery] = useState("");
  const lookups = lookupByNames(query);
  // В композицию идут только точные совпадения: объекты, найденные лишь по смыслу, человек
  // не называл, их он добавляет сам, кликом по карточке.
  const found = lookups.flatMap((lookup) =>
    lookup.exact && lookup.matches[0] ? [lookup.matches[0].object.id] : [],
  );

  const assembleFound = () => {
    const { defaultSize } = useSceneStore.getState();
    void applyAssembly(
      [...new Set(found)].map((objectId) => ({
        objectId,
        state: "main" as const,
        size: defaultSize,
      })),
    );
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="library-search">Найти по названию</Label>
        <Input
          id="library-search"
          type="search"
          placeholder="Телефон, лампа, книга"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Можно перечислить несколько названий через запятую.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Нажмите на объект, чтобы положить его в центр холста, или перетащите на
        холст.
      </p>

      {lookups.length === 0 ? (
        <ul className="grid grid-cols-2 gap-2">
          {LIBRARY_OBJECTS.map((object) => (
            <ObjectCard key={object.id} object={object} />
          ))}
        </ul>
      ) : (
        <>
          {lookups.map((lookup) => (
            <section
              key={lookup.query}
              aria-label={`Результаты для «${lookup.query}»`}
              className="grid gap-2"
            >
              <h3 className="text-xs font-semibold text-muted-foreground">
                «{lookup.query}»
              </h3>
              {lookup.matches.length === 0 ? (
                <p className="text-sm">В библиотеке нет такого объекта.</p>
              ) : (
                <>
                  {!lookup.exact && (
                    <p className="text-sm">
                      Такого объекта нет. Похоже по смыслу:
                    </p>
                  )}
                  <ul className="grid grid-cols-2 gap-2">
                    {lookup.matches.map(({ object }) => (
                      <ObjectCard key={object.id} object={object} />
                    ))}
                  </ul>
                </>
              )}
            </section>
          ))}
          <Button
            type="button"
            disabled={found.length === 0}
            onClick={assembleFound}
          >
            Собрать композицию из найденного
          </Button>
        </>
      )}
    </div>
  );
}
