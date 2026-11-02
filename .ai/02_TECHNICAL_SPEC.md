# Техническая спецификация и структуры данных

## Структуры данных (TypeScript)

```typescript
// Компонент из библиотеки
interface LibraryComponent {
  id: string;
  name: string;
  tags: string[];
  size: 'S' | 'L';
  type: 'main' | 'background';
  svgContent: string; // Оригинальный SVG код
  viewBox: string;
}

// Экземпляр на холсте
interface CanvasObject {
  instanceId: string; // uuid
  componentId: string; // ссылка на LibraryComponent
  x: number;
  y: number;
  rotation: number; // в градусах
  zIndex: number;
  state: 'main' | 'background'; // Влияет на перекраску
}

// Цветовая схема
interface ColorScheme {
  id: string;
  name: string;
  mainColors: string[]; // Для главных объектов
  backgroundColors: string[]; // Для фоновых
}
```

## Управление состоянием (Zustand Store)

- `canvasObjects`: CanvasObject[]
    
- `selectedObjectId`: string | null
    
- `currentScheme`: ColorScheme
    
- `currentSize`: 'S' | 'L'
    
- Действия: `addObject`, `removeObject`, `updateObject`, `bringToFront`, `sendToBack`, `setScheme`, `setSize`.

## Механика перекраски (SVG Recoloring)

Поскольку объекты менять нельзя, перекраска происходит через модификацию атрибутов `fill` и `stroke` в SVG-дереве.

1. При загрузке SVG, парсим его через `DOMParser`.
    
2. Для каждого тега (`path`, `circle`, `rect` и т.д.) смотрим текущий цвет.
    
3. Используем маппинг: `originalColor -> targetColor` из выбранной `ColorScheme`.
    
4. Если объект в состоянии `background`, применяем только `backgroundColors`, игнорируя цветные.
    
5. Для применения изменений используем `XMLSerializer` или рендерим через `dangerouslySetInnerHTML` (с предварительной санитизацией).

## Механика смены размера (S / L)

В библиотеке должны быть парные компоненты (например, `PC_S` и `PC_L`).  
При смене `currentSize`:

1. Берем все `CanvasObject`.
    
2. Ищем `componentId` с аналогичным именем, но другим суффиксом размера.
    
3. Заменяем `componentId` в объекте, сохраняя его координаты, поворот и z-index.

## Экспорт

При экспорте собираем виртуальный SVG:

1. Создаем корневой `<svg>` с `viewBox` холста.
    
2. Для каждого `CanvasObject` (отсортированного по z-index):
    
    - Берем его `svgContent`.
        
    - Оборачиваем в `<g transform="translate(x, y) rotate(deg)">`.
        
    - Применяем перекраску.
        
3. Сериализуем в строку и скачиваем как `.svg` файл.

## Интеграция AI (Сценарий 1)

Функция `assembleByMetaphor(metaphor: string)`:

- Формирует промпт: "У тебя есть библиотека компонентов с тегами: [список тегов]. Пользователь ввел метафору: '{metaphor}'. Выбери 3-5 ID компонентов, которые лучше всего подходят, и верни их в формате JSON."
    
- Получает JSON, находит компоненты в библиотеке и вызывает `addObject` с авто-позиционированием (например, по сетке или кругу, чтобы не перекрывались).