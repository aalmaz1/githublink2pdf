# Руководство по добавлению новых дизайнов резюме

## Архитектура системы дизайнов

Система использует **CSS Custom Properties (переменные)** для легкого переключения между 30+ дизайнами. Каждый дизайн определяется:

1. **Набором CSS-переменных** (цвета, шрифты, отступы)
2. **Уникальным CSS-классом** на `body` элементе (`theme-{id}`)
3. **Метаданными** в файле `design-templates.ts`

### Структура файлов

```
src/
├── designs/
│   └── design-templates.ts    # Реестр всех дизайнов (названия, категории, описания)
├── styles.css                 # Все CSS стили для всех дизайнов
└── main.ts                    # Логика переключения дизайнов
```

---

## Как добавить новый дизайн (пошагово)

### Шаг 1: Добавить дизайн в реестр

Откройте `/workspace/src/designs/design-templates.ts` и добавьте новый объект в массив `DESIGNS`:

```typescript
{
  id: 'my-new-design',           // Уникальный ID (латиница, без пробелов)
  name: 'My Design',             // Отображаемое название
  category: 'professional',      // Категория: professional | creative | minimal | tech | business | elegant | bold
  description: 'Описание дизайна', // Краткое описание для dropdown
  cssClass: 'theme-my-new-design' // CSS класс (должен начинаться с 'theme-')
}
```

**Пример:**
```typescript
{
  id: 'neon',
  name: 'Neon',
  category: 'tech',
  description: 'Futuristic neon glow effect',
  cssClass: 'theme-neon'
}
```

### Шаг 2: Добавить CSS стили

Откройте `/workspace/src/styles.css` и добавьте стили для нового дизайна после секции `/* ==================== BOLD DESIGNS ==================== */`:

```css
/* Neon - Futuristic neon glow effect */
body.theme-neon {
  --primary-color: #00ffff;
  --accent-color: #ff00ff;
  --font-family: var(--font-mono);
  --padding-unit: 18px;
  --heading-color: #0a0a0a;
  --muted-color: #666666;
  --bg-surface: #0d0d0d;
  --border-color: #333333;
}

body.theme-neon #resume-container {
  background: #0d0d0d;
  color: #00ffff;
  border: 2px solid #00ffff;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
}

body.theme-neon h1 {
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
  font-family: var(--font-mono);
}

body.theme-neon .section-block h3 {
  color: #ff00ff;
  border: 1px solid #ff00ff;
  padding: 10px 16px;
  text-transform: uppercase;
  font-family: var(--font-mono);
  box-shadow: 0 0 15px rgba(255, 0, 255, 0.4);
}

body.theme-neon p, 
body.theme-neon li, 
body.theme-neon span {
  color: #00ffff !important;
}

body.theme-neon .period {
  color: #ff00ff !important;
}
```

### Шаг 3: Пересобрать проект

```bash
npm run build
```

Готово! Новый дизайн появится в выпадающем списке автоматически.

---

## Рекомендации по созданию дизайнов

### 1. Используйте CSS-переменные

Каждый дизайн должен определять эти переменные:

```css
body.theme-{id} {
  --primary-color: #xxxxxx;      /* Основной цвет */
  --accent-color: #xxxxxx;       /* Акцентный цвет */
  --font-family: var(--font-body); /* Шрифт (body или heading) */
  --padding-unit: 16px;          /* Базовый отступ */
  --heading-color: #xxxxxx;      /* Цвет заголовков */
  --muted-color: #xxxxxx;        /* Цвет второстепенного текста */
  --bg-surface: #xxxxxx;         /* Цвет фона */
  --border-color: #xxxxxx;       /* Цвет границ */
}
```

### 2. Стилизируйте ключевые элементы

Обязательно настройте:

- `h1` — имя кандидата
- `.section-block h3` — заголовки секций (Experience, Education, Skills)
- `.resume-header` — шапка резюме
- `.period` — даты периода работы
- `#resume-container` — общий контейнер

### 3. Категории дизайнов

| Категория | Описание | Примеры цветов |
|-----------|----------|----------------|
| `professional` | Консервативные, для бизнеса | Синий, серый, черный |
| `creative` | Яркие, для дизайнеров | Оранжевый, фиолетовый, градиенты |
| `minimal` | Минималистичные, чистые | Черно-белые, много воздуха |
| `tech` | Для разработчиков | Моноширинные шрифты, темные темы |
| `business` | Корпоративные | Строгие цвета, четкие линии |
| `elegant` | Элегантные, премиум | Золотой, бордовый, фиолетовый |
| `bold` | Смелые, яркие | Красный, контрастные сочетания |

### 4. Адаптивность

Все дизайны автоматически адаптируются под мобильные устройства благодаря существующим media queries в `styles.css`. Проверьте, чтобы ваш дизайн корректно смотрелся при ширине экрана < 768px.

### 5. Плавное переключение

CSS-переменные обеспечивают мгновенное переключение без перезагрузки. Избегайте `transition` на `body`, чтобы переключение было быстрым.

---

## Генерация разнообразных дизайнов

### Пресеты цветовых палитр

Используйте эти готовые палитры для быстрого создания:

**Professional Blue:**
```css
--primary-color: #1e40af;
--accent-color: #3b82f6;
--heading-color: #1e3a8a;
--muted-color: #60a5fa;
```

**Creative Sunset:**
```css
--primary-color: #dd6b20;
--accent-color: #ed8936;
--heading-color: #78350f;
--muted-color: #fbd38d;
```

**Minimal Mono:**
```css
--primary-color: #111827;
--accent-color: #6b7280;
--heading-color: #111827;
--muted-color: #9ca3af;
```

**Tech Dark:**
```css
--primary-color: #61dafb;
--accent-color: #00d8ff;
--heading-color: #282c34;
--bg-surface: #1e1e1e;
```

**Elegant Gold:**
```css
--primary-color: #b45309;
--accent-color: #d97706;
--heading-color: #78350f;
--bg-surface: #fffbeb;
```

### Идеи для новых дизайнов

1. **Vintage** — стиль старых газет, бежевый фон, serif шрифты
2. **Gradient** — градиентные заголовки и границы
3. **Border-heavy** — толстые рамки вокруг всех секций
4. **Shadow-depth** — глубокие тени для объема
5. **Rounded** — скругленные углы у всех элементов
6. **Asymmetric** — асимметричное расположение блоков
7. **Magazine** — журнальная верстка с колонками
8. **Watercolor** — акварельные фоновые эффекты

---

## Отладка

### Проверить доступные дизайны

В консоли браузера:
```javascript
import { DESIGNS } from './designs/design-templates';
console.log(DESIGNS.map(d => d.name));
```

### Принудительно применить дизайн

В консоли:
```javascript
document.body.className = 'theme-neon';
```

### Сбросить сохраненный дизайн

В консоли:
```javascript
localStorage.removeItem('resume-design');
location.reload();
```

---

## Производительность

- Все CSS загружаются сразу (в одном файле `styles.css`)
- Переключение происходит через смену класса на `body` (мгновенно)
- Нет динамических импортов для упрощения архитектуры
- 30 дизайнов добавляют ~35KB к размеру CSS (минимально)

---

## Пример полного кода нового дизайна

Добавьте в `design-templates.ts`:
```typescript
{
  id: 'retro',
  name: 'Retro',
  category: 'creative',
  description: '80s retro style with vibrant colors',
  cssClass: 'theme-retro'
}
```

Добавьте в `styles.css`:
```css
/* Retro - 80s retro style */
body.theme-retro {
  --primary-color: #ff0080;
  --accent-color: #00ffff;
  --font-family: var(--font-heading);
  --padding-unit: 20px;
  --heading-color: #ff0080;
  --muted-color: #ff69b4;
  --bg-surface: #fff0f5;
  --border-color: #ffb6c1;
}

body.theme-retro h1 {
  color: #ff0080;
  text-shadow: 3px 3px 0px #00ffff;
  font-style: italic;
}

body.theme-retro .section-block h3 {
  background: linear-gradient(90deg, #ff0080, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-transform: uppercase;
  letter-spacing: 2px;
}

body.theme-retro .entity-item {
  border-left: 3px dashed #ff0080;
  padding-left: 16px;
}
```

Пересоберите:
```bash
npm run build
```

---

## FAQ

**Q: Можно ли сделать импорт CSS динамическим?**  
A: Да, но это усложнит архитектуру. Текущий подход с одним файлом проще и быстрее для 30 дизайнов.

**Q: Как добавить шрифт для конкретного дизайна?**  
A: Добавьте `@import` в начало `styles.css` или используйте Google Fonts в `index.html`.

**Q: Дизайн ломается при печати PDF?**  
A: Проверьте `@media print` стили в `styles.css`. Некоторые дизайны могут требовать специальных правил для печати.

**Q: Можно ли группировать дизайны в dropdown?**  
A: Да, они уже сгруппированы по категориям через `<optgroup>`.

---

## Поддержка

При возникновении проблем:
1. Проверьте, что `id` уникален
2. Убедитесь, что `cssClass` начинается с `theme-`
3. Проверьте синтаксис CSS
4. Пересоберите проект
